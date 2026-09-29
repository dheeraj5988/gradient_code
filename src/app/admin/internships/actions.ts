"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { SLUG_RE, UUID_RE, bool, lines, num, slugify, str } from "@/lib/admin/util";

const MODES = ["Remote", "Hybrid", "On-site"];

export async function saveInternship(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const title = str(form, "title");
  const slug = str(form, "slug") || slugify(title);
  const mode = str(form, "mode");
  const duration = num(form, "duration_weeks");
  const smin = num(form, "stipend_min");
  const smax = num(form, "stipend_max");
  const openings = num(form, "openings");
  const course = str(form, "required_course_id");
  const applyBy = str(form, "apply_by");
  const errs: Record<string, string> = {};
  if (title.length < 3 || title.length > 140) errs.title = "3–140 characters.";
  if (!SLUG_RE.test(slug)) errs.slug = "Lowercase letters, numbers and hyphens.";
  if (!MODES.includes(mode)) errs.mode = "Choose a mode.";
  if (duration === null || Number.isNaN(duration) || !Number.isInteger(duration) || duration < 1 || duration > 104) errs.duration_weeks = "1–104 weeks.";
  if (smin === null || Number.isNaN(smin) || smin < 0) errs.stipend_min = "0 or more.";
  if (smax !== null && (Number.isNaN(smax) || (smin !== null && smax < smin))) errs.stipend_max = "Must be at least the minimum.";
  if (openings === null || Number.isNaN(openings) || !Number.isInteger(openings) || openings < 1) errs.openings = "At least 1.";
  if (course && !UUID_RE.test(course)) errs.required_course_id = "Invalid course.";
  if (applyBy && !/^\d{4}-\d{2}-\d{2}$/.test(applyBy)) errs.apply_by = "Use a valid date.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const publish = bool(form, "is_published");
  const description = String(form.get("description") ?? "").trim();
  if (publish && description.length < 30) return { ok: false, error: "Add a description (at least 30 characters) before publishing.", fieldErrors: { description: "Too short to publish." } };
  const row = {
    title, slug, mode, company: str(form, "company") || "Gradient Code", location: str(form, "location") || "Remote",
    duration_weeks: duration, stipend_min: smin, stipend_max: smax, openings, description,
    skills: lines(form, "skills"), responsibilities: lines(form, "responsibilities"), perks: lines(form, "perks"),
    required_course_id: course || null, apply_by: applyBy || null, is_published: publish,
  };
  const res = id ? await g.ctx.supabase.from("internships").update(row).eq("id", id).select("id").single() : await g.ctx.supabase.from("internships").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "That slug is already used." : "Couldn't save the internship." };
  await audit(g.ctx, id ? "internship.update" : "internship.create", "internship", res.data.id, `${id ? "Updated" : "Created"} internship “${title}” (${publish ? "published" : "draft"})`);
  revalidatePath("/admin", "layout");
  revalidatePath("/internships", "layout");
  return { ok: true, data: { id: res.data.id }, message: "Internship saved." };
}

const STATUSES = ["applied", "shortlisted", "interview", "offered", "rejected"];
export async function setApplicationStatus(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const status = str(form, "status");
  const note = str(form, "note").slice(0, 500);
  const internal = bool(form, "internal");
  if (!UUID_RE.test(id) || !STATUSES.includes(status)) return { ok: false, error: "Invalid request." };
  const { error } = await g.ctx.supabase.rpc("admin_set_application_status", { _application_id: id, _status: status, _note: note || null, _internal: internal });
  if (error) return { ok: false, error: error.message.includes("application_withdrawn") ? "The applicant withdrew this application." : "Couldn't update the application." };
  await audit(g.ctx, "application.status", "internship_application", id, `Set application to ${status}${internal ? " (internal note)" : ""}`, { status, note, internal });
  revalidatePath("/admin/internships/applications");
  revalidatePath("/dashboard/applications");
  return { ok: true, data: null, message: "Updated." };
}
