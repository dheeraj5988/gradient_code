"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult, type AdminCtx } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, parseDriveId, slugify, str } from "@/lib/admin/util";
import { DriveError, driveConfigStatus, getFolder, listFolder } from "@/lib/google-drive/client";
import { buildPlan, scanTree, type Existing, type ImportPlan } from "@/lib/google-drive/importer";

async function existingFor(ctx: AdminCtx, courseId: string | null): Promise<Existing> {
  const empty: Existing = { moduleFolderIds: new Set(), lessonFileIds: new Set(), resourceFileIds: new Set() };
  if (!courseId) return empty;
  const s = ctx.supabase;
  const { data: mods } = await s.from("course_modules").select("id,drive_folder_id").eq("course_id", courseId);
  const modIds = (mods ?? []).map((m) => m.id);
  const [{ data: ls }, { data: rs }] = await Promise.all([
    modIds.length ? s.from("lessons").select("drive_file_id").in("module_id", modIds).not("drive_file_id", "is", null) : Promise.resolve({ data: [] as { drive_file_id: string }[] }),
    s.from("course_resources").select("drive_file_id").eq("course_id", courseId).not("drive_file_id", "is", null),
  ]);
  return {
    moduleFolderIds: new Set((mods ?? []).map((m) => m.drive_folder_id).filter(Boolean) as string[]),
    lessonFileIds: new Set((ls ?? []).map((l) => l.drive_file_id as string)),
    resourceFileIds: new Set((rs ?? []).map((r) => r.drive_file_id as string)),
  };
}

async function scan(ctx: AdminCtx, folderId: string, courseId: string | null) {
  const root = await getFolder(folderId);
  const tree = await scanTree({ id: root.id, name: root.name }, listFolder);
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

export type ImportSummary = { courseId: string; createdCourse: boolean; modulesCreated: number; lessonsCreated: number; resourcesCreated: number; skippedExisting: number; excluded: number };

/**
 * Step 2: import as DRAFT. Re-scans server-side (never trusts the client's plan),
 * applies the admin's exclusions, skips anything already imported (Drive IDs are the
 * idempotency key), and creates everything unpublished. Never deletes or overwrites.
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

  const { data: existingMods } = await s.from("course_modules").select("id,drive_folder_id,order_index").eq("course_id", courseId);
  let nextModuleOrder = Math.max(-1, ...(existingMods ?? []).map((m) => m.order_index)) + 1;
  const modByFolder = new Map((existingMods ?? []).filter((m) => m.drive_folder_id).map((m) => [m.drive_folder_id as string, m.id as string]));
  const sum: ImportSummary = { courseId: courseId!, createdCourse, modulesCreated: 0, lessonsCreated: 0, resourcesCreated: 0, skippedExisting: 0, excluded: 0 };

  for (const m of plan.modules) {
    if (excluded.has(`m:${m.key}`)) { sum.excluded += m.lessons.length + m.resources.length; continue; }
    const lessons = m.lessons.filter((l) => { if (l.exists) { sum.skippedExisting++; return false; } if (excluded.has(`f:${l.driveFileId}`)) { sum.excluded++; return false; } return true; });
    const resources = m.resources.filter((r) => { if (r.exists) { sum.skippedExisting++; return false; } if (excluded.has(`f:${r.driveFileId}`)) { sum.excluded++; return false; } return true; });
    if (!lessons.length && !resources.length) continue;

    // Root-level documents with no videos → course-wide resources (no module).
    const courseWide = m.key === "__root__" && !lessons.length;
    let moduleId: string | null | undefined = courseWide ? null : m.driveFolderId ? modByFolder.get(m.driveFolderId) : undefined;
    if (moduleId === undefined) {
      const { data: nm, error } = await s.from("course_modules").insert({ course_id: courseId, title: m.title, order_index: nextModuleOrder++, drive_folder_id: m.driveFolderId }).select("id").single();
      if (error) return { ok: false, error: `Stopped at module “${m.title}”: ${error.message}. Items imported so far are kept as drafts.` };
      moduleId = nm.id as string;
      sum.modulesCreated++;
      if (m.driveFolderId) modByFolder.set(m.driveFolderId, moduleId);
    }
    if (lessons.length) {
      const { count } = await s.from("lessons").select("id", { count: "exact", head: true }).eq("module_id", moduleId!);
      const rows = lessons.map((l, i) => ({
        module_id: moduleId, title: l.title.slice(0, 200), slug: slugify(l.title), type: "video", order_index: (count ?? 0) + i,
        is_published: false, is_free_preview: false, video_provider: "drive", drive_file_id: l.driveFileId, drive_name: l.driveName,
        drive_mime_type: l.mimeType, drive_size: l.size, drive_modified_time: l.modifiedTime,
        video_url: `https://drive.google.com/file/d/${l.driveFileId}/preview`,
      }));
      const { error } = await s.from("lessons").insert(rows); // existing Drive IDs were filtered above; the unique index blocks races
      if (error) return { ok: false, error: `Stopped while adding lessons to “${m.title}”: ${error.message}` };
      sum.lessonsCreated += rows.length;
    }
    if (resources.length) {
      const rows = resources.map((r, i) => ({
        course_id: courseId, module_id: moduleId, title: r.title.slice(0, 200), resource_type: r.resourceType, drive_file_id: r.driveFileId,
        drive_mime_type: r.mimeType, drive_size: r.size, is_downloadable: true, is_published: false, order_index: i,
      }));
      const { error } = await s.from("course_resources").insert(rows);
      if (error) return { ok: false, error: `Stopped while adding resources to “${m.title}”: ${error.message}` };
      sum.resourcesCreated += rows.length;
    }
  }
  await audit(ctx, "import.drive", "import", courseId, `Imported Drive folder “${plan.root.name}” as draft: ${sum.modulesCreated} modules, ${sum.lessonsCreated} lessons, ${sum.resourcesCreated} resources`, { folder_id: folderId, ...sum });
  revalidatePath("/admin", "layout");
  return { ok: true, data: sum, message: "Import complete. Everything was added as unpublished drafts." };
}
