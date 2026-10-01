"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult, type AdminCtx } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, parseDriveId, slugify, str } from "@/lib/admin/util";
import { DriveError, downloadSmallText, driveConfigStatus, getFolder, listFolder } from "@/lib/google-drive/client";
import { buildPlan, normTitle, scanTree, type Existing, type ImportPlan, type PlanLesson } from "@/lib/google-drive/importer";

async function existingFor(ctx: AdminCtx, courseId: string | null): Promise<Existing> {
  const empty: Existing = { moduleFolderIds: new Set(), lessonFileIds: new Set(), resourceFileIds: new Set() };
  if (!courseId) return empty;
  const s = ctx.supabase;
  const { data: mods } = await s.from("course_modules").select("id,title,drive_folder_id").eq("course_id", courseId);
  const modIds = (mods ?? []).map((m) => m.id);
  const [{ data: ls }, { data: rs }] = await Promise.all([
    modIds.length ? s.from("lessons").select("drive_file_id").in("module_id", modIds).not("drive_file_id", "is", null) : Promise.resolve({ data: [] as { drive_file_id: string }[] }),
    s.from("course_resources").select("drive_file_id").eq("course_id", courseId).not("drive_file_id", "is", null),
  ]);
  return {
    moduleFolderIds: new Set((mods ?? []).map((m) => m.drive_folder_id).filter(Boolean) as string[]),
    lessonFileIds: new Set((ls ?? []).map((l) => l.drive_file_id as string)),
    resourceFileIds: new Set((rs ?? []).map((r) => r.drive_file_id as string)),
    moduleTitles: new Set((mods ?? []).filter((m) => !m.drive_folder_id).map((m) => normTitle(m.title))),
  };
}

async function scan(ctx: AdminCtx, folderId: string, courseId: string | null) {
  const root = await getFolder(folderId);
  const tree = await scanTree({ id: root.id, name: root.name, description: root.description }, listFolder);
  return buildPlan(tree, await existingFor(ctx, courseId));
}

function driveErrorMessage(e: unknown) {
  if (e instanceof DriveError) return e.status === 404 ? "SOURCE INACCESSIBLE — Google Drive returned 404. Share the folder with the service account email (Viewer) and try again." : e.message;
  return "Couldn't reach Google Drive. Check the credentials in Settings.";
}

export type ScanResult = { plan: ImportPlan; folderId: string; courseId: string | null; courseTitle: string | null };

/** Step 1: scan + classify + preview. Read-only. */
export async function scanDriveFolder(_prev: unknown, form: FormData): Promise<ActionResult<ScanResult>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  if (driveConfigStatus().mode === "none") return { ok: false, error: "BLOCKED — Google Drive credentials are not configured. See Settings and docs/GOOGLE_DRIVE_SETUP.md." };
  const folderId = parseDriveId(str(form, "folder"));
  if (!folderId) return { ok: false, error: "Enter a Google Drive folder URL or ID.", fieldErrors: { folder: "Invalid folder" } };
  const courseId = str(form, "course_id") || null;
  if (courseId && !UUID_RE.test(courseId)) return { ok: false, error: "Invalid course." };
  let courseTitle: string | null = null;
  if (courseId) {
    const { data } = await g.ctx.supabase.from("courses").select("title").eq("id", courseId).maybeSingle();
    if (!data) return { ok: false, error: "Course not found." };
    courseTitle = data.title;
  }
  try {
    const plan = await scan(g.ctx, folderId, courseId);
    return { ok: true, data: { plan, folderId, courseId, courseTitle } };
  } catch (e) {
    return { ok: false, error: driveErrorMessage(e) };
  }
}

export type ImportSummary = {
  courseId: string; createdCourse: boolean; modulesCreated: number; modulesLinked: number; lessonsCreated: number; resourcesCreated: number;
  captionsAdded: number; descriptionsAdded: number; skippedExisting: number; excluded: number; failed: string[];
};

const MAX_DESCRIPTION = 5000;
const clip = (t: string | null | undefined) => (t ? t.trim().slice(0, MAX_DESCRIPTION) : "") || null;

/** Runs async work with limited concurrency (Drive reads are I/O bound; keep Google quotas happy). */
async function pool<T>(items: T[], size: number, fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/** Description text: sidecar file (if any) wins over the Drive "description" field. */
async function descriptionText(fileId: string | null, fallback: string | null) {
  if (fileId) {
    const t = await downloadSmallText(fileId, 64_000).catch(() => null);
    if (t?.trim()) return clip(t);
  }
  return clip(fallback);
}

/**
 * Step 2: import as DRAFT. Re-scans server-side (never trusts the client's plan),
 * applies the admin's exclusions, skips anything already imported (Drive IDs are the
 * idempotency key), and creates everything unpublished. Never deletes or overwrites:
 * descriptions are only filled where empty and captions only added if missing.
 * A failure in one module is reported and the import continues with the next one.
 */
export async function runDriveImport(_prev: unknown, form: FormData): Promise<ActionResult<ImportSummary>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const s = ctx.supabase;
  const folderId = parseDriveId(str(form, "folder"));
  const courseIdIn = str(form, "course_id") || null;
  if (!folderId || (courseIdIn && !UUID_RE.test(courseIdIn))) return { ok: false, error: "Invalid request." };
  const excluded = new Set(form.getAll("exclude").map(String));
  const title = str(form, "title");

  let plan: ImportPlan;
  try { plan = await scan(ctx, folderId, courseIdIn); } catch (e) { return { ok: false, error: driveErrorMessage(e) }; }

  let courseId = courseIdIn;
  let createdCourse = false;
  if (!courseId) {
    const t = (title || plan.suggestedTitle).slice(0, 160);
    if (t.length < 5) return { ok: false, error: "Give the new course a title (5+ characters)." };
    const { data: already } = await s.from("courses").select("id,title").eq("drive_folder_id", folderId).maybeSingle();
    if (already) return { ok: false, error: `This folder was already imported as “${already.title}”. Choose that course as the target to add new files.` };
    let slug = slugify(t);
    for (let i = 2; i < 50; i++) { const { data: taken } = await s.from("courses").select("id").eq("slug", slug).maybeSingle(); if (!taken) break; slug = `${slugify(t)}-${i}`; }
    const { data: c, error } = await s.from("courses").insert({ title: t, slug, status: "draft", description: "", track: "General", level: "All levels", price: 0, drive_folder_id: folderId, created_by: ctx.userId }).select("id").single();
    if (error) return { ok: false, error: `Couldn't create the course: ${error.message}` };
    courseId = c.id as string;
    createdCourse = true;
  }

  const { data: existingMods } = await s.from("course_modules").select("id,title,drive_folder_id,order_index,description").eq("course_id", courseId);
  // Unlinked legacy modules can be matched by title (then linked to the Drive folder).
  const unlinkedByTitle = new Map((existingMods ?? []).filter((m) => !m.drive_folder_id).map((m) => [normTitle(m.title), m.id as string]));
  let nextModuleOrder = Math.max(-1, ...(existingMods ?? []).map((m) => m.order_index)) + 1;
  const modByFolder = new Map((existingMods ?? []).filter((m) => m.drive_folder_id).map((m) => [m.drive_folder_id as string, m.id as string]));
  const modDescription = new Map((existingMods ?? []).map((m) => [m.id as string, (m.description as string | null) ?? null]));
  const { count: resourceCount } = await s.from("course_resources").select("id", { count: "exact", head: true }).eq("course_id", courseId!);
  let nextResourceOrder = resourceCount ?? 0;
  const sum: ImportSummary = { courseId: courseId!, createdCourse, modulesCreated: 0, modulesLinked: 0, lessonsCreated: 0, resourcesCreated: 0, captionsAdded: 0, descriptionsAdded: 0, skippedExisting: 0, excluded: 0, failed: [] };
  /** Lessons (new or already imported) whose captions/descriptions should be filled in after the structural import. */
  const enrich: { moduleId: string; lesson: PlanLesson }[] = [];
  const moduleEnrich: { moduleId: string; fileId: string | null; text: string | null }[] = [];

  for (const m of plan.modules) {
    if (excluded.has(`m:${m.key}`)) { sum.excluded += m.lessons.length + m.resources.length; continue; }
    try {
      const lessons = m.lessons.filter((l) => { if (l.exists) { sum.skippedExisting++; return false; } if (excluded.has(`f:${l.driveFileId}`)) { sum.excluded++; return false; } return true; });
      const resources = m.resources.filter((r) => { if (r.exists) { sum.skippedExisting++; return false; } if (excluded.has(`f:${r.driveFileId}`)) { sum.excluded++; return false; } return true; });

      // Root-level documents with no videos → course-wide resources (no module).
      const courseWide = m.key === "__root__" && !m.lessons.length;
      let moduleId: string | null | undefined = courseWide ? null : m.driveFolderId ? modByFolder.get(m.driveFolderId) : undefined;
      if (moduleId === undefined && m.driveFolderId && unlinkedByTitle.has(normTitle(m.title))) {
        moduleId = unlinkedByTitle.get(normTitle(m.title))!;
        unlinkedByTitle.delete(normTitle(m.title));
        const { error } = await s.from("course_modules").update({ drive_folder_id: m.driveFolderId }).eq("id", moduleId);
        if (error) throw new Error(error.message);
        modByFolder.set(m.driveFolderId, moduleId);
        sum.modulesLinked++;
      }
      if (moduleId === undefined && (lessons.length || resources.length)) {
        const { data: nm, error } = await s.from("course_modules").insert({ course_id: courseId, title: m.title.slice(0, 200), order_index: nextModuleOrder++, drive_folder_id: m.driveFolderId }).select("id").single();
        if (error) throw new Error(error.message);
        moduleId = nm.id as string;
        sum.modulesCreated++;
        if (m.driveFolderId) modByFolder.set(m.driveFolderId, moduleId);
      }
      if (!moduleId && !courseWide) continue; // nothing new and no matching module

      if (moduleId) {
        if (!modDescription.get(moduleId) && (m.descriptionFileId || m.description)) moduleEnrich.push({ moduleId, fileId: m.descriptionFileId, text: m.description });
        for (const l of m.lessons) if (!excluded.has(`f:${l.driveFileId}`) && (l.captions.length || l.description || l.descriptionFileId)) enrich.push({ moduleId, lesson: l });
      }

      if (lessons.length && moduleId) {
        const { count } = await s.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId);
        const rows = lessons.map((l, i) => ({
          module_id: moduleId, title: l.title.slice(0, 200), slug: slugify(l.title), type: "video", order_index: (count ?? 0) + i,
          is_published: false, is_free_preview: false, video_provider: "drive", drive_file_id: l.driveFileId, drive_name: l.driveName,
          drive_mime_type: l.mimeType, drive_size: l.size, drive_modified_time: l.modifiedTime,
          video_url: `https://drive.google.com/file/d/${l.driveFileId}/preview`,
        }));
        const { error } = await s.from("lessons").insert(rows); // existing Drive IDs were filtered above; the unique index blocks races
        if (error) throw new Error(`lessons: ${error.message}`);
        sum.lessonsCreated += rows.length;
      }
      if (resources.length) {
        const rows = resources.map((r) => ({
          course_id: courseId, module_id: moduleId, title: r.title.slice(0, 200), description: clip(r.description), resource_type: r.resourceType, drive_file_id: r.driveFileId,
          drive_name: r.driveName, drive_mime_type: r.mimeType, drive_size: r.size, is_downloadable: true, is_published: false, order_index: nextResourceOrder++,
        }));
        const { error } = await s.from("course_resources").insert(rows);
        if (error) throw new Error(`resources: ${error.message}`);
        sum.resourcesCreated += rows.length;
      }
    } catch (e) {
      sum.failed.push(`${m.title}: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  // Captions + descriptions (also back-fills lessons imported earlier). Never overwrites existing text.
  try {
    const moduleIds = [...new Set(enrich.map((e) => e.moduleId))];
    const { data: rows } = moduleIds.length
      ? await s.from("lessons").select("id,module_id,drive_file_id,description").in("module_id", moduleIds).not("drive_file_id", "is", null)
      : { data: [] as { id: string; module_id: string; drive_file_id: string; description: string | null }[] };
    const lessonByKey = new Map((rows ?? []).map((r) => [`${r.module_id}:${r.drive_file_id}`, r]));
    const lessonIds = (rows ?? []).map((r) => r.id as string);
    const { data: caps } = lessonIds.length ? await s.from("lesson_captions").select("lesson_id,drive_file_id").in("lesson_id", lessonIds) : { data: [] as { lesson_id: string; drive_file_id: string }[] };
    const haveCap = new Set((caps ?? []).map((c) => `${c.lesson_id}:${c.drive_file_id}`));

    const captionRows: Record<string, unknown>[] = [];
    const needDescription: { id: string; lesson: PlanLesson }[] = [];
    for (const { moduleId, lesson } of enrich) {
      const row = lessonByKey.get(`${moduleId}:${lesson.driveFileId}`);
      if (!row) continue;
      lesson.captions.forEach((c, i) => {
        if (haveCap.has(`${row.id}:${c.driveFileId}`)) return;
        haveCap.add(`${row.id}:${c.driveFileId}`);
        captionRows.push({ lesson_id: row.id, drive_file_id: c.driveFileId, drive_name: c.driveName, format: c.format, language: c.language, label: c.label, is_default: i === 0 });
      });
      if (!row.description && (lesson.description || lesson.descriptionFileId)) needDescription.push({ id: row.id as string, lesson });
    }
    for (let i = 0; i < captionRows.length; i += 200) {
      const { error } = await s.from("lesson_captions").insert(captionRows.slice(i, i + 200));
      if (error) { sum.failed.push(`Subtitles: ${error.message}`); break; }
      sum.captionsAdded += Math.min(200, captionRows.length - i);
    }
    await pool(needDescription, 8, async ({ id, lesson }) => {
      const text = await descriptionText(lesson.descriptionFileId, lesson.description);
      if (!text) return;
      const { error } = await s.from("lessons").update({ description: text }).eq("id", id).is("description", null);
      if (!error) sum.descriptionsAdded++;
    });
    await pool(moduleEnrich, 8, async ({ moduleId, fileId, text: fallback }) => {
      const text = await descriptionText(fileId, fallback);
      if (!text) return;
      const { error } = await s.from("course_modules").update({ description: text }).eq("id", moduleId).is("description", null);
      if (!error) sum.descriptionsAdded++;
    });
    if (plan.courseDescription || plan.courseDescriptionFileId) {
      const { data: course } = await s.from("courses").select("description").eq("id", courseId!).maybeSingle();
      if (course && !course.description?.trim()) {
        const text = await descriptionText(plan.courseDescriptionFileId, plan.courseDescription);
        if (text) { const { error } = await s.from("courses").update({ description: text }).eq("id", courseId!); if (!error) sum.descriptionsAdded++; }
      }
    }
  } catch (e) {
    sum.failed.push(`Subtitles/descriptions: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  await audit(ctx, "import.drive", "import", courseId, `Imported Drive folder “${plan.root.name}” as draft: ${sum.modulesCreated} modules, ${sum.lessonsCreated} lessons, ${sum.resourcesCreated} resources, ${sum.captionsAdded} subtitles${sum.failed.length ? `, ${sum.failed.length} failed` : ""}`, { folder_id: folderId, ...sum });
  revalidatePath("/admin", "layout");
  return { ok: true, data: sum, message: sum.failed.length ? "Import finished with some errors — see the list below." : "Import complete. Everything was added as unpublished drafts." };
}
