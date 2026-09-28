"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { SLUG_RE, UUID_RE, slugify, str } from "@/lib/admin/util";

const GRANT_SOURCES = ["admin", "scholarship", "promotion"];

/** Manual enrollment grant (auditable). Payment-based enrollment is NOT done here. */
export async function grantEnrollment(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const who = str(form, "student").toLowerCase();
  const courseId = str(form, "course_id");
  const source = str(form, "source");
  const expires = str(form, "expires_at");
  const notes = str(form, "notes").slice(0, 500);
  const errs: Record<string, string> = {};
  if (!who) errs.student = "Enter the student's email.";
  if (!UUID_RE.test(courseId)) errs.course_id = "Choose a course.";
  if (!GRANT_SOURCES.includes(source)) errs.source = "Choose a reason.";
  if (expires && !/^\d{4}-\d{2}-\d{2}$/.test(expires)) errs.expires_at = "Use a valid date.";
  if (notes.length < 3) errs.notes = "Add a short reason (kept in the audit log).";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const { data: profile } = UUID_RE.test(who)
    ? await ctx.supabase.from("profiles").select("id,email,full_name").eq("id", who).maybeSingle()
    : await ctx.supabase.from("profiles").select("id,email,full_name").ilike("email", who).maybeSingle();
  if (!profile) return { ok: false, error: "No student found with that email. They need to sign up first.", fieldErrors: { student: "Not found" } };
  const { data: existing } = await ctx.supabase.from("enrollments").select("id").eq("user_id", profile.id).eq("course_id", courseId).maybeSingle();
  if (existing) return { ok: false, error: "This student is already enrolled in that course." };
  const { data, error } = await ctx.supabase
    .from("enrollments")
    .insert({ user_id: profile.id, course_id: courseId, source, granted_by: ctx.userId, notes, expires_at: expires ? new Date(expires + "T23:59:59").toISOString() : null })
    .select("id, course:courses(title,slug)")
    .single();
  if (error) return { ok: false, error: error.message };
  const course = data.course as unknown as { title: string; slug: string } | null;
  await audit(ctx, "enrollment.grant", "enrollment", data.id, `Granted ${profile.email ?? profile.full_name} access to “${course?.title}” (${source})`, { user_id: profile.id, course_id: courseId, source, notes, expires_at: expires || null });
  revalidatePath("/admin", "layout");
  if (course?.slug) revalidatePath(`/learn/${course.slug}`, "layout");
  return { ok: true, data: null, message: `Enrolled ${profile.email ?? profile.full_name}.` };
}

export async function revokeEnrollment(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid enrollment." };
  const { data: e } = await g.ctx.supabase.from("enrollments").select("user_id,course_id,source").eq("id", id).maybeSingle();
  if (!e) return { ok: false, error: "Enrollment not found." };
  if (e.source === "payment") return { ok: false, error: "Paid enrollments must be refunded through the payments flow, not revoked here." };
  const { error } = await g.ctx.supabase.from("enrollments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "enrollment.revoke", "enrollment", id, "Revoked manual enrollment", e);
  revalidatePath("/admin", "layout");
  return { ok: true, data: null, message: "Access revoked. The learner's progress is kept." };
}

export async function saveInstructor(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const name = str(form, "name");
  const slug = str(form, "slug") || slugify(name);
  const urls = ["avatar_url", "linkedin_url", "website_url"].map((k) => [k, str(form, k)] as const);
  const errs: Record<string, string> = {};
  if (name.length < 2 || name.length > 120) errs.name = "2–120 characters.";
  if (!SLUG_RE.test(slug)) errs.slug = "Lowercase letters, numbers and hyphens.";
  urls.forEach(([k, v]) => { if (v && !/^https:\/\/\S+$/.test(v)) errs[k] = "Use an https:// URL."; });
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const row = { name, slug, headline: str(form, "headline") || null, bio: str(form, "bio"), ...Object.fromEntries(urls.map(([k, v]) => [k, v || null])) };
  const res = id ? await g.ctx.supabase.from("instructors").update(row).eq("id", id).select("id").single() : await g.ctx.supabase.from("instructors").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "Slug already used by another instructor." : res.error.message };
  await audit(g.ctx, id ? "instructor.update" : "instructor.create", "instructor", res.data.id, `${id ? "Updated" : "Added"} instructor ${name}`);
  revalidatePath("/admin", "layout");
  revalidatePath(`/instructors/${slug}`);
  return { ok: true, data: { id: res.data.id }, message: "Instructor saved." };
}

export async function moderateReview(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const hide = str(form, "hide") === "true";
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid review." };
  const { data, error } = await g.ctx.supabase.from("course_reviews").update({ is_hidden: hide, moderated_by: g.ctx.userId, moderated_at: new Date().toISOString() }).eq("id", id).select("course_id").single();
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, hide ? "review.hide" : "review.restore", "review", id, hide ? "Hid a review" : "Restored a review", { course_id: data.course_id });
  revalidatePath("/admin", "layout");
  revalidatePath("/courses", "layout");
  return { ok: true, data: null, message: hide ? "Review hidden." : "Review restored." };
}
