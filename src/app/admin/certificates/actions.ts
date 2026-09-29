"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, bool, num, str } from "@/lib/admin/util";

export async function saveCertificatePolicy(courseId: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Invalid course." };
  const lessons = num(form, "min_lessons_pct");
  const practice = num(form, "min_practice_pct");
  const code = str(form, "code").toUpperCase();
  const errs: Record<string, string> = {};
  if (lessons === null || Number.isNaN(lessons) || !Number.isInteger(lessons) || lessons < 0 || lessons > 100) errs.min_lessons_pct = "0–100";
  if (practice === null || Number.isNaN(practice) || !Number.isInteger(practice) || practice < 0 || practice > 100) errs.min_practice_pct = "0–100";
  if (code && !/^[A-Z0-9]{2,8}$/.test(code)) errs.code = "2–8 letters/digits";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const enabled = bool(form, "enabled");
  const { error } = await g.ctx.supabase.from("certificate_policies").upsert({ course_id: courseId, enabled, min_lessons_pct: lessons, min_practice_pct: practice, code: code || null, updated_by: g.ctx.userId, updated_at: new Date().toISOString() });
  if (error) return { ok: false, error: "Couldn't save the policy." };
  await audit(g.ctx, "certificate.policy", "course", courseId, `Certificate policy: ${enabled ? "on" : "off"}, lessons ≥${lessons}%, practice ≥${practice}%`, { enabled, lessons, practice, code });
  revalidatePath("/admin/certificates", "layout");
  return { ok: true, data: null, message: "Saved." };
}

export async function setCertificateRevoked(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const revoke = str(form, "revoke") === "true";
  const reason = str(form, "reason").slice(0, 300);
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid certificate." };
  if (revoke && reason.length < 3) return { ok: false, error: "Add a reason for revoking." };
  const { error } = await g.ctx.supabase.rpc("admin_set_certificate_revoked", { _id: id, _revoked: revoke, _reason: reason || null });
  if (error) return { ok: false, error: "Couldn't update the certificate." };
  await audit(g.ctx, revoke ? "certificate.revoke" : "certificate.reinstate", "certificate", id, revoke ? `Revoked a certificate: ${reason}` : "Reinstated a certificate", { reason });
  revalidatePath("/admin/certificates");
  return { ok: true, data: null, message: revoke ? "Certificate revoked." : "Certificate reinstated." };
}
