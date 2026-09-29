"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, bool, num, str } from "@/lib/admin/util";
import { createServiceClient, serviceConfigured } from "@/lib/supabase/service";
import { encryptSecret } from "@/lib/payments/crypto";
import { loadPaymentConfig } from "@/lib/payments/config";
import { PAYPUR_BASE } from "@/lib/payments/paypur";

/** Saves gateway settings. Key/salt are write-only: blank keeps the stored value. Secrets are never audited or echoed. */
export async function savePaymentSettings(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  if (!serviceConfigured()) return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not set on the server, so gateway settings can't be stored." };
  const key = str(form, "gateway_key");
  const salt = str(form, "gateway_salt");
  const testAmount = num(form, "test_amount");
  const pct = num(form, "referral_commission_percent");
  const days = num(form, "referral_clearance_days");
  const minPayout = num(form, "referral_min_payout");
  const errs: Record<string, string> = {};
  if (key && (key.length < 8 || key.length > 200)) errs.gateway_key = "That doesn't look like a valid key.";
  if (salt && (salt.length < 8 || salt.length > 200)) errs.gateway_salt = "That doesn't look like a valid salt.";
  if (testAmount === null || Number.isNaN(testAmount) || testAmount < 1 || testAmount > 10000) errs.test_amount = "Enter an amount between ₹1 and ₹10,000.";
  if (pct === null || Number.isNaN(pct) || pct < 0 || pct > 100) errs.referral_commission_percent = "0–100.";
  if (days === null || Number.isNaN(days) || !Number.isInteger(days) || days < 0 || days > 90) errs.referral_clearance_days = "Whole days, 0–90.";
  if (minPayout === null || Number.isNaN(minPayout) || minPayout < 0) errs.referral_min_payout = "0 or more.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };

  const svc = createServiceClient();
  const { data: cur } = await svc.from("payment_settings").select("gateway_key_enc,gateway_salt_enc").eq("id", true).maybeSingle();
  const patch: Record<string, unknown> = {
    enabled: bool(form, "enabled"),
    test_mode: bool(form, "test_mode"),
    test_amount: testAmount,
    referral_enabled: bool(form, "referral_enabled"),
    referral_commission_percent: pct,
    referral_clearance_days: days,
    referral_min_payout: minPayout,
    updated_by: g.ctx.userId,
    updated_at: new Date().toISOString(),
  };
  try {
    if (key) { patch.gateway_key_enc = encryptSecret(key); patch.gateway_key_hint = key.slice(-4); }
    if (salt) patch.gateway_salt_enc = encryptSecret(salt);
  } catch {
    return { ok: false, error: "No encryption secret is available on the server (set SUPABASE_SERVICE_ROLE_KEY or PAYMENT_SETTINGS_KEY)." };
  }
  const hasKey = !!(key || cur?.gateway_key_enc), hasSalt = !!(salt || cur?.gateway_salt_enc);
  if (patch.enabled && !(hasKey && hasSalt) && !(process.env.PAYPUR_KEY && process.env.PAYPUR_SALT)) return { ok: false, error: "Add both the Gateway Key and Gateway Salt before turning payments on." };
  const { error } = await svc.from("payment_settings").upsert({ id: true, ...patch });
  if (error) return { ok: false, error: "Couldn't save settings. Has the payments migration been run?" };
  await audit(g.ctx, "payments.settings", "payment_settings", null, "Updated payment settings", {
    enabled: patch.enabled, test_mode: patch.test_mode, test_amount: testAmount, key_changed: !!key, salt_changed: !!salt,
    referral_enabled: patch.referral_enabled, commission_percent: pct, clearance_days: days, min_payout: minPayout,
  });
  revalidatePath("/admin/payments");
  return { ok: true, data: null, message: "Payment settings saved." };
}

export async function clearGatewayCredentials(_prev: unknown, _form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  if (!serviceConfigured()) return { ok: false, error: "Service key missing." };
  const { error } = await createServiceClient().from("payment_settings").update({ gateway_key_enc: null, gateway_salt_enc: null, gateway_key_hint: null, enabled: false, updated_by: g.ctx.userId, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) return { ok: false, error: "Couldn't clear credentials." };
  await audit(g.ctx, "payments.credentials_cleared", "payment_settings", null, "Removed gateway credentials and switched payments off");
  revalidatePath("/admin/payments");
  return { ok: true, data: null, message: "Credentials removed and payments switched off." };
}

/**
 * Best-effort connectivity check: asks the gateway about a non-existent transaction with the saved key.
 * 401/403 → key rejected. Anything else → the gateway is reachable. It can't prove the salt is right.
 */
export async function testGateway(_prev: unknown, _form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const cfg = await loadPaymentConfig();
  if (!cfg.creds) return { ok: false, error: cfg.problem ?? "No credentials saved." };
  try {
    const res = await fetch(`${PAYPUR_BASE}/api/merchant/status?txn_id=connection_test`, { headers: { "X-PAYPUR-KEY": cfg.creds.key }, signal: AbortSignal.timeout(10_000), cache: "no-store" });
    if (res.status === 401 || res.status === 403) return { ok: false, error: `The gateway rejected the Gateway Key (HTTP ${res.status}). Re-check it in the Paypur dashboard.` };
    return { ok: true, data: null, message: `Gateway reachable (HTTP ${res.status}); key was not rejected. The salt is only proven by a real ₹1 test purchase.` };
  } catch {
    return { ok: false, error: "Couldn't reach the gateway from the server." };
  }
}

/** Refund bookkeeping only — money is returned from the Paypur dashboard. Removes payment access & cancels unpaid commission. */
export async function markOrderRefunded(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const note = str(form, "note").slice(0, 300);
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid order." };
  if (note.length < 3) return { ok: false, error: "Add a short note (e.g. the refund reference from Paypur)." };
  const { error } = await g.ctx.supabase.rpc("admin_mark_order_refunded", { _order_id: id, _note: note });
  if (error) return { ok: false, error: error.message.includes("order_not_refundable") ? "Only paid orders can be refunded." : "Couldn't mark as refunded." };
  await audit(g.ctx, "order.refund", "order", id, "Marked order refunded and removed access", { note });
  revalidatePath("/admin", "layout");
  return { ok: true, data: null, message: "Marked as refunded; course access removed." };
}
