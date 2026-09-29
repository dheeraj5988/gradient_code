"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, num, str } from "@/lib/admin/util";

/** Give a user a custom (vanity) code and/or a per-code commission override. */
export async function saveReferralCode(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const email = str(form, "email").toLowerCase();
  const code = str(form, "code").toUpperCase();
  const pct = num(form, "commission_percent");
  const errs: Record<string, string> = {};
  if (!email) errs.email = "Enter the user's email.";
  if (!/^[A-Z0-9_-]{3,20}$/.test(code)) errs.code = "3–20 characters: A–Z, 0–9, - or _.";
  if (pct !== null && (Number.isNaN(pct) || pct < 0 || pct > 100)) errs.commission_percent = "0–100, or leave empty for the default.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const { data: profile } = await g.ctx.supabase.from("profiles").select("id,email").ilike("email", email).maybeSingle();
  if (!profile) return { ok: false, error: "No user with that email. They need to sign up first.", fieldErrors: { email: "Not found" } };
  const { error } = await g.ctx.supabase.from("referral_codes").upsert({ user_id: profile.id, code, commission_percent: pct, is_active: true }, { onConflict: "user_id" });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "That code is already taken.", fieldErrors: { code: "Taken" } };
    return { ok: false, error: "Couldn't save the code." };
  }
  await audit(g.ctx, "referral.code", "referral_code", profile.id, `Set referral code ${code} for ${profile.email}`, { code, commission_percent: pct });
  revalidatePath("/admin/referrals");
  return { ok: true, data: null, message: `Code ${code} saved.` };
}

export async function toggleReferralCode(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid code." };
  const active = str(form, "active") === "true";
  const { error } = await g.ctx.supabase.from("referral_codes").update({ is_active: active }).eq("id", id);
  if (error) return { ok: false, error: "Couldn't update the code." };
  await audit(g.ctx, active ? "referral.enable" : "referral.disable", "referral_code", id, `${active ? "Enabled" : "Disabled"} a referral code`);
  revalidatePath("/admin/referrals");
  return { ok: true, data: null };
}

export async function processPayout(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const action = str(form, "action");
  const reference = str(form, "reference").slice(0, 100);
  const note = str(form, "note").slice(0, 300);
  if (!UUID_RE.test(id) || !["complete", "reject"].includes(action)) return { ok: false, error: "Invalid request." };
  if (action === "complete" && !reference) return { ok: false, error: "Enter the UPI/bank transaction reference after paying." };
  if (action === "reject" && note.length < 3) return { ok: false, error: "Add a reason for rejecting." };
  const { error } = await g.ctx.supabase.rpc("admin_process_payout", { _payout_id: id, _action: action, _reference: reference || null, _note: note || null });
  if (error) return { ok: false, error: error.message.includes("payout_not_open") ? "This payout was already processed." : "Couldn't process the payout." };
  await audit(g.ctx, `payout.${action}`, "referral_payout", id, action === "complete" ? `Marked payout paid (ref ${reference})` : "Rejected payout", { reference, note });
  revalidatePath("/admin/referrals");
  return { ok: true, data: null, message: action === "complete" ? "Payout marked as paid." : "Payout rejected; the commission is available again." };
}
