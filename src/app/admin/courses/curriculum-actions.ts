"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult, type AdminCtx } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { DRIVE_ID_RE, UUID_RE, bool, parseDriveId, slugify, str } from "@/lib/admin/util";

/* eslint-disable @typescript-eslint/no-explicit-any */

const PROVIDERS = ["none", "drive", "youtube", "vimeo", "html5", "external"] as const;
const TYPES = ["video", "text", "live"] as const;

async function courseSlugOfModule(ctx: AdminCtx, moduleId: string) {
  const { data } = await ctx.supabase.from("course_modules").select("course_id, course:courses(slug)").eq("id", moduleId).maybeSingle();
  return data as unknown as { course_id: string; course: { slug: string } | null } | null;
}

function revalidateCurriculum(courseId: string, slug?: string | null) {
  revalidatePath(`/admin/courses/${courseId}`, "layout");
  if (slug) { revalidatePath(`/courses/${slug}`); revalidatePath(`/learn/${slug}`, "layout"); }
}

/** Re-number siblings 0..n in their current order, then swap `id` with its neighbour. */
async function move(ctx: AdminCtx, table: "course_modules" | "lessons", parentKey: "course_id" | "module_id", parentId: string, id: string, dir: "up" | "down") {
  const { data: rows } = await ctx.supabase.from(table).select("id,order_index").eq(parentKey, parentId).order("order_index").order("created_at");
  const list = (rows ?? []).map((r) => r.id as string);
  const i = list.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return false;
  [list[i], list[j]] = [list[j], list[i]];
  const current = new Map((rows ?? []).map((r) => [r.id as string, r.order_index as number]));
  for (let k = 0; k < list.length; k++) {
    if (current.get(list[k]) !== k) {
      const { error } = await ctx.supabase.from(table).update({ order_index: k }).eq("id", list[k]);
      if (error) return false;
    }
  }
  return true;
}

/* ---------------------------------- Modules ---------------------------------- */

export async function saveModule(courseId: string, moduleId: string | null, _prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const title = str(form, "title");
  if (!UUID_RE.test(courseId) || (moduleId && !UUID_RE.test(moduleId))) return { ok: false, error: "Invalid request." };
  if (title.length < 2 || title.length > 200) return { ok: false, error: "Module title must be 2–200 characters.", fieldErrors: { title: "2–200 characters" } };
  const description = str(form, "description") || null;
  const { data: course } = await ctx.supabase.from("courses").select("slug").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, error: "Course not found." };
  if (moduleId) {
    const { error } = await ctx.supabase.from("course_modules").update({ title, description }).eq("id", moduleId).eq("course_id", courseId);
    if (error) return { ok: false, error: error.message };
    await audit(ctx, "module.update", "module", moduleId, `Renamed module to “${title}”`, { course_id: courseId });
  } else {
    const { count } = await ctx.supabase.from("course_modules").select("id", { count: "exact", head: true }).eq("course_id", courseId);
    const { data, error } = await ctx.supabase.from("course_modules").insert({ course_id: courseId, title, description, order_index: count ?? 0 }).select("id").single();
    if (error) return { ok: false, error: error.message };
    await audit(ctx, "module.create", "module", data.id, `Added module “${title}”`, { course_id: courseId });
  }
  revalidateCurriculum(courseId, course.slug);
  return { ok: true, data: null, message: moduleId ? "Module saved." : "Module added." };
}

export async function moveModule(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? "up" : "down";
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid module." };
  const info = await courseSlugOfModule(g.ctx, id);
  if (!info) return { ok: false, error: "Module not found." };
  if (!(await move(g.ctx, "course_modules", "course_id", info.course_id, id, dir))) return { ok: false, error: "Can't move further." };
  await audit(g.ctx, "module.reorder", "module", id, `Moved module ${dir}`, { course_id: info.course_id });
  revalidateCurriculum(info.course_id, info.course?.slug);
  return { ok: true, data: null };
}

export async function deleteModule(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid module." };
  const { count } = await g.ctx.supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", id);
  if (count) return { ok: false, error: "Remove or move this module's lessons first. (Deleting lessons can erase learner progress.)" };
  const info = await courseSlugOfModule(g.ctx, id);
  const { data: m } = await g.ctx.supabase.from("course_modules").select("title").eq("id", id).maybeSingle();
  const { error } = await g.ctx.supabase.from("course_modules").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "module.delete", "module", id, `Deleted empty module “${m?.title ?? ""}”`, { course_id: info?.course_id });
  if (info) revalidateCurriculum(info.course_id, info.course?.slug);
  return { ok: true, data: null, message: "Module deleted." };
}

/* ---------------------------------- Lessons ---------------------------------- */

function parseDuration(v: string): number | null {
  if (!v) return 0;
  if (/^\d+$/.test(v)) return Number(v) * 60; // minutes
  const m = v.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Create or update a lesson. New lessons are UNPUBLISHED unless explicitly published. */
export async function saveLesson(courseId: string, lessonId: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  if (!UUID_RE.test(courseId) || (lessonId && !UUID_RE.test(lessonId))) return { ok: false, error: "Invalid request." };
  const moduleId = str(form, "module_id");
  const title = str(form, "title");
  const type = str(form, "type") as (typeof TYPES)[number];
  const provider = (str(form, "video_provider") || "none") as (typeof PROVIDERS)[number];
  const source = str(form, "video_source");
  const errs: Record<string, string> = {};
  if (!UUID_RE.test(moduleId)) errs.module_id = "Choose a module.";
  if (title.length < 2 || title.length > 200) errs.title = "Title must be 2–200 characters.";
  if (!TYPES.includes(type)) errs.type = "Choose a lesson type.";
  if (!PROVIDERS.includes(provider)) errs.video_provider = "Choose a video provider.";
  const duration = parseDuration(str(form, "duration"));
  if (duration == null || duration > 24 * 3600) errs.duration = "Use minutes (e.g. 12) or mm:ss / hh:mm:ss.";
  const slug = str(form, "slug") || slugify(title);

  // Video source → columns. Drive URLs are normalised to a file ID; the player streams via /api/video.
  const media: Record<string, unknown> = { video_provider: provider === "none" ? "html5" : provider };
  if (provider === "none") Object.assign(media, { video_url: null, drive_file_id: null });
  else if (provider === "drive") {
    const fid = parseDriveId(source);
    if (!fid || !DRIVE_ID_RE.test(fid)) errs.video_source = "Enter a Google Drive file ID or file URL.";
    // Legacy preview URL kept for backward compatibility with the old site / iframe fallback.
    else Object.assign(media, { drive_file_id: fid, video_url: `https://drive.google.com/file/d/${fid}/preview` });
  } else {
    if (!/^https:\/\/\S+$/.test(source)) errs.video_source = "Enter an https:// URL.";
    else Object.assign(media, { video_url: source, drive_file_id: null });
  }
  const joinUrl = str(form, "join_url");
  if (type === "live" && joinUrl && !/^https:\/\/\S+$/.test(joinUrl)) errs.join_url = "Enter an https:// link.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };

  const { data: mod } = await ctx.supabase.from("course_modules").select("id,course_id").eq("id", moduleId).maybeSingle();
  if (!mod || mod.course_id !== courseId) return { ok: false, error: "That module doesn't belong to this course." };
  const { data: course } = await ctx.supabase.from("courses").select("slug").eq("id", courseId).maybeSingle();

  const row: Record<string, unknown> = {
    module_id: moduleId,
    title,
    slug,
    type,
    duration_seconds: duration,
    description: str(form, "description") || null,
    content_text: str(form, "content_text") || null,
    is_free_preview: bool(form, "is_free_preview"),
    is_required: bool(form, "is_required"),
    is_published: bool(form, "is_published"),
    join_url: type === "live" ? joinUrl || null : null,
    ...(type === "video" ? media : { video_url: null, drive_file_id: null, video_provider: "html5" }),
  };

  if (lessonId) {
    const { data: before } = await ctx.supabase.from("lessons").select("module_id").eq("id", lessonId).maybeSingle();
    if (!before) return { ok: false, error: "Lesson not found." };
    if (before.module_id !== moduleId) {
      const { count } = await ctx.supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
      row.order_index = count ?? 0;
    }
    const { error } = await ctx.supabase.from("lessons").update(row).eq("id", lessonId);
    if (error) return { ok: false, error: error.code === "23505" ? "This Drive file is already used by another lesson in that module." : error.message };
    await audit(ctx, "lesson.update", "lesson", lessonId, `Updated lesson “${title}”`, { course_id: courseId, published: row.is_published });
    revalidateCurriculum(courseId, course?.slug);
    return { ok: true, data: { id: lessonId }, message: "Lesson saved." };
  }
  const { count } = await ctx.supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await ctx.supabase.from("lessons").insert({ ...row, order_index: count ?? 0 }).select("id").single();
  if (error) return { ok: false, error: error.code === "23505" ? "This Drive file is already used by another lesson in that module." : error.message };
  await audit(ctx, "lesson.create", "lesson", data.id, `Added lesson “${title}”`, { course_id: courseId });
  revalidateCurriculum(courseId, course?.slug);
  return { ok: true, data: { id: data.id }, message: "Lesson created." };
}

/** Quick add from the curriculum page: title + type, created as an unpublished draft. */
export async function quickAddLesson(courseId: string, moduleId: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const title = str(form, "title");
  const type = str(form, "type");
  if (!UUID_RE.test(courseId) || !UUID_RE.test(moduleId)) return { ok: false, error: "Invalid request." };
  if (title.length < 2 || title.length > 200) return { ok: false, error: "Lesson title must be 2–200 characters." };
  if (!TYPES.includes(type as never)) return { ok: false, error: "Choose a type." };
  const { data: mod } = await g.ctx.supabase.from("course_modules").select("course_id, course:courses(slug)").eq("id", moduleId).maybeSingle();
  if (!mod || (mod as any).course_id !== courseId) return { ok: false, error: "Module not found." };
  const { count } = await g.ctx.supabase.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
  const { data, error } = await g.ctx.supabase.from("lessons").insert({ module_id: moduleId, title, slug: slugify(title), type, order_index: count ?? 0, is_published: false }).select("id").single();
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "lesson.create", "lesson", data.id, `Added draft lesson “${title}”`, { course_id: courseId });
  revalidateCurriculum(courseId, (mod as any).course?.slug);
  return { ok: true, data: null, message: "Draft lesson added — open it to add a video." };
}

export async function moveLesson(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const dir = str(form, "dir") === "up" ? "up" : "down";
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid lesson." };
  const { data: l } = await g.ctx.supabase.from("lessons").select("module_id").eq("id", id).maybeSingle();
  if (!l) return { ok: false, error: "Lesson not found." };
  const info = await courseSlugOfModule(g.ctx, l.module_id);
  if (!(await move(g.ctx, "lessons", "module_id", l.module_id, id, dir))) return { ok: false, error: "Can't move further." };
  await audit(g.ctx, "lesson.reorder", "lesson", id, `Moved lesson ${dir}`, { course_id: info?.course_id });
  if (info) revalidateCurriculum(info.course_id, info.course?.slug);
  return { ok: true, data: null };
}

export async function toggleLessonFlag(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const field = str(form, "field");
  const value = str(form, "value") === "true";
  if (!UUID_RE.test(id) || !["is_published", "is_free_preview"].includes(field)) return { ok: false, error: "Invalid request." };
  const { data: l, error } = await g.ctx.supabase.from("lessons").update({ [field]: value }).eq("id", id).select("module_id,title").single();
  if (error) return { ok: false, error: error.message };
  const info = await courseSlugOfModule(g.ctx, l.module_id);
  await audit(g.ctx, `lesson.${field === "is_published" ? (value ? "publish" : "unpublish") : value ? "preview_on" : "preview_off"}`, "lesson", id, `${field === "is_published" ? (value ? "Published" : "Unpublished") : value ? "Enabled preview for" : "Disabled preview for"} “${l.title}”`, { course_id: info?.course_id });
  if (info) revalidateCurriculum(info.course_id, info.course?.slug);
  return { ok: true, data: null };
}

export async function deleteLesson(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid lesson." };
  const [{ count: progress }, { count: notes }] = await Promise.all([
    g.ctx.supabase.from("lesson_progress").select("id", { count: "exact", head: true }).eq("lesson_id", id),
    g.ctx.supabase.from("learner_notes").select("id", { count: "exact", head: true }).eq("lesson_id", id),
  ]);
  if (progress) return { ok: false, error: `${progress} learner(s) have completed this lesson. Unpublish it instead of deleting.` };
  const { data: l } = await g.ctx.supabase.from("lessons").select("module_id,title").eq("id", id).maybeSingle();
  if (!l) return { ok: false, error: "Lesson not found." };
  const info = await courseSlugOfModule(g.ctx, l.module_id);
  const { error } = await g.ctx.supabase.from("lessons").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "lesson.delete", "lesson", id, `Deleted lesson “${l.title}”`, { course_id: info?.course_id, notes_affected: notes ?? 0 });
  if (info) revalidateCurriculum(info.course_id, info.course?.slug);
  return { ok: true, data: null, message: "Lesson deleted." };
}
