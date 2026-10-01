"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { loadCompleteness } from "@/lib/admin/course-data";
import { SLUG_RE, UUID_RE, bool, lines, num, slugify, str } from "@/lib/admin/util";

/* eslint-disable @typescript-eslint/no-explicit-any */

const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];

function revalidateCourse(slug?: string) {
  revalidatePath("/admin", "layout");
  revalidatePath("/courses");
  revalidatePath("/");
  if (slug) { revalidatePath(`/courses/${slug}`); revalidatePath(`/learn/${slug}`, "layout"); }
}

/** Create (id = null) or update a course. New courses are always drafts. */
export async function saveCourse(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  if (id && !UUID_RE.test(id)) return { ok: false, error: "Invalid course." };

  const title = str(form, "title");
  const slug = str(form, "slug") || slugify(title);
  const price = num(form, "price");
  const mrp = num(form, "mrp");
  const hours = num(form, "hours");
  const projects = num(form, "projects");
  const accessDays = num(form, "access_days");
  const accessPolicy = str(form, "access_policy") === "days" ? "days" : "lifetime";
  const level = str(form, "level");
  const errs: Record<string, string> = {};
  if (title.length < 5 || title.length > 160) errs.title = "Title must be 5–160 characters.";
  if (!SLUG_RE.test(slug) || slug.length > 80) errs.slug = "Use lowercase letters, numbers and hyphens only.";
  if (price == null || Number.isNaN(price) || price < 0 || price > 1_000_000 || !Number.isInteger(price)) errs.price = "Enter a whole rupee amount (0 for free).";
  if (mrp != null && (Number.isNaN(mrp) || mrp < 0 || !Number.isInteger(mrp))) errs.mrp = "Enter a whole rupee amount.";
  else if (mrp != null && price != null && mrp <= price) errs.mrp = "Original price must be higher than the price, or left empty.";
  if (!LEVELS.includes(level)) errs.level = "Choose a level.";
  if (!str(form, "track")) errs.track = "Choose or enter a category.";
  if (hours != null && (Number.isNaN(hours) || hours < 0 || hours > 1000)) errs.hours = "Enter hours between 0 and 1000.";
  if (projects != null && (Number.isNaN(projects) || projects < 0 || projects > 100 || !Number.isInteger(projects))) errs.projects = "Enter a whole number.";
  if (accessPolicy === "days" && (accessDays == null || Number.isNaN(accessDays) || accessDays < 1)) errs.access_days = "Enter the number of access days.";
  const thumb = str(form, "thumbnail_url");
  if (thumb && !/^https:\/\/\S+$/.test(thumb)) errs.thumbnail_url = "Use an https:// image URL.";
  const instructorId = str(form, "instructor_id");
  if (instructorId && !UUID_RE.test(instructorId)) errs.instructor_id = "Invalid instructor.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };

  // Slug uniqueness
  const { data: clash } = await ctx.supabase.from("courses").select("id").eq("slug", slug).neq("id", id ?? "00000000-0000-0000-0000-000000000000").maybeSingle();
  if (clash) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: { slug: "Another course already uses this slug." } };

  const row = {
    title,
    slug,
    subtitle: str(form, "subtitle") || null,
    description: str(form, "description"),
    thumbnail_url: thumb || null,
    track: str(form, "track"),
    level,
    language: str(form, "language") || "English",
    price,
    mrp,
    access_policy: accessPolicy,
    access_days: accessPolicy === "days" ? accessDays : null,
    is_crash_course: bool(form, "is_crash_course"),
    is_featured: bool(form, "is_featured"),
    has_internship: bool(form, "has_internship"),
    is_demo: bool(form, "is_demo"),
    what_you_learn: lines(form, "what_you_learn"),
    requirements: lines(form, "requirements"),
    target_audience: lines(form, "target_audience"),
    skills: str(form, "skills").split(",").map((x) => x.trim()).filter(Boolean).slice(0, 40),
    includes: { hours: hours ?? undefined, projects: projects ?? undefined, certificate: bool(form, "certificate_enabled") },
    instructor_id: instructorId || null,
    instructor_name: null as string | null,
  };
  if (instructorId) {
    const { data: inst } = await ctx.supabase.from("instructors").select("name").eq("id", instructorId).maybeSingle();
    row.instructor_name = inst?.name ?? null;
  }

  if (id) {
    const { data: before } = await ctx.supabase.from("courses").select("slug,status").eq("id", id).maybeSingle();
    if (!before) return { ok: false, error: "Course not found." };
    // Only touch the thumbnail if the URL field was edited — a thumbnail uploaded after this form loaded must not be wiped.
    const { thumbnail_url, ...rest } = row;
    const changes = thumb === str(form, "thumbnail_url_initial") ? rest : { ...rest, thumbnail_url };
    const { error } = await ctx.supabase.from("courses").update(changes).eq("id", id);
    if (error) return { ok: false, error: `Couldn't save: ${error.message}` };
    await audit(ctx, "course.update", "course", id, `Updated course “${title}”`);
    revalidateCourse(before.slug);
    if (before.slug !== slug) revalidateCourse(slug);
    return { ok: true, data: { id }, message: "Course saved." };
  }
  const { data, error } = await ctx.supabase.from("courses").insert({ ...row, status: "draft", created_by: ctx.userId }).select("id").single();
  if (error) return { ok: false, error: `Couldn't create: ${error.message}` };
  await audit(ctx, "course.create", "course", data.id, `Created draft course “${title}”`);
  revalidateCourse();
  return { ok: true, data: { id: data.id }, message: "Draft course created." };
}

/** Publish / unpublish (→draft) / archive. Publishing is validated server-side. */
export async function setCourseStatus(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const id = str(form, "id");
  const status = str(form, "status");
  if (!UUID_RE.test(id) || !["draft", "published", "archived"].includes(status)) return { ok: false, error: "Invalid request." };
  const loaded = await loadCompleteness(ctx, id);
  if (!loaded) return { ok: false, error: "Course not found." };
  if (status === "published" && !loaded.result.canPublish) {
    return { ok: false, error: `Can't publish yet — missing: ${loaded.result.blockers.map((b) => b.label).join(", ")}.` };
  }
  const { error } = await ctx.supabase.from("courses").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  const verb = status === "published" ? "publish" : status === "archived" ? "archive" : "unpublish";
  await audit(ctx, `course.${verb}`, "course", id, `${verb[0].toUpperCase() + verb.slice(1)}ed “${loaded.course.title}”`);
  revalidateCourse(loaded.course.slug);
  return { ok: true, data: null, message: status === "published" ? "Course is live." : status === "archived" ? "Course archived." : "Course moved to draft." };
}

/** Duplicate a course as a DRAFT, including modules and lessons (no learner data). */
export async function duplicateCourse(_prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid course." };
  const s = ctx.supabase;
  const { data: c } = await s.from("courses").select("*").eq("id", id).maybeSingle();
  if (!c) return { ok: false, error: "Course not found." };
  let slug = `${c.slug}-copy`.slice(0, 80);
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await s.from("courses").select("id").eq("slug", slug).maybeSingle();
    if (!taken) break;
    slug = `${c.slug}-copy-${i}`.slice(0, 80);
  }
  const { id: _i, created_at: _c, updated_at: _u, rating_avg: _r, rating_count: _rc, students_count: _sc, drive_folder_id: _d, archived_at: _a, status: _s, is_published: _p, ...rest } = c;
  const { data: copy, error } = await s.from("courses").insert({ ...rest, slug, title: `${c.title} (copy)`, status: "draft", created_by: ctx.userId }).select("id").single();
  if (error) return { ok: false, error: error.message };
  const { data: modules } = await s.from("course_modules").select("*").eq("course_id", id).order("order_index");
  for (const m of modules ?? []) {
    const { data: nm } = await s.from("course_modules").insert({ course_id: copy.id, title: m.title, description: m.description, order_index: m.order_index }).select("id").single();
    if (!nm) continue;
    const { data: ls } = await s.from("lessons").select("*").eq("module_id", m.id);
    if (ls?.length) {
      await s.from("lessons").insert(ls.map(({ id: _li, created_at: _lc, updated_at: _lu, module_id: _lm, ...l }: any) => ({ ...l, module_id: nm.id })));
    }
  }
  await audit(ctx, "course.duplicate", "course", copy.id, `Duplicated “${c.title}”`, { source: id });
  revalidateCourse();
  return { ok: true, data: { id: copy.id }, message: "Copy created as a draft." };
}

const THUMB_TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
};

/** Uploads a course thumbnail to the public `course-thumbnails` bucket (admin-only write via Storage RLS) and saves its URL. */
export async function uploadCourseThumbnail(courseId: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Invalid course." };
  const file = form.get("file");
  if (!(file instanceof File) || !file.size) return { ok: false, error: "Choose an image file." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Image must be 5 MB or smaller." };
  const kind = THUMB_TYPES[file.type];
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!kind || !kind.magic(bytes)) return { ok: false, error: "Use a PNG, JPG or WebP image." };
  const { data: course } = await ctx.supabase.from("courses").select("slug").eq("id", courseId).maybeSingle();
  if (!course) return { ok: false, error: "Course not found." };

  const path = `${courseId}/${Date.now()}.${kind.ext}`;
  const up = await ctx.supabase.storage.from("course-thumbnails").upload(path, bytes, { contentType: file.type, upsert: false, cacheControl: "31536000" });
  if (up.error) {
    const missing = /bucket not found/i.test(up.error.message);
    return { ok: false, error: missing ? "Storage bucket missing — run migration 20261001110000_course_thumbnails_bucket.sql in Supabase, then try again." : `Upload failed: ${up.error.message}` };
  }
  const url = ctx.supabase.storage.from("course-thumbnails").getPublicUrl(path).data.publicUrl;
  const { error } = await ctx.supabase.from("courses").update({ thumbnail_url: url }).eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  await audit(ctx, "course.thumbnail", "course", courseId, "Uploaded a new thumbnail", { path });
  revalidatePath(`/admin/courses/${courseId}`, "layout");
  revalidatePath("/courses", "layout");
  revalidatePath(`/courses/${course.slug}`);
  return { ok: true, data: null, message: "Thumbnail uploaded and saved." };
}
