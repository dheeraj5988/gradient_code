import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { loadPaymentConfig } from "./config";
import { getPaymentStatus, isFailureStatus, isSuccessStatus } from "./paypur";

export const REF_COOKIE = "gc_ref";

/** Validate a referral code for a buyer. Returns the code row id, or null (never throws). */
export async function resolveReferral(code: string | undefined, buyerId: string): Promise<string | null> {
  if (!code || !/^[A-Z0-9_-]{3,20}$/.test(code)) return null;
  const { data } = await createServiceClient().from("referral_codes").select("id,user_id,is_active").eq("code", code).maybeSingle();
  return data && data.is_active && data.user_id !== buyerId ? (data.id as string) : null;
}

/** Paypur adds a random 0–99 paise to every transaction (unique-amount UPI matching). */
export const GATEWAY_EXTRA_PAISE_MAX = 99;

/**
 * Which verified amount to check against our order. Both sources are trusted (the callback amount is
 * HMAC-signed with our salt; the status API is server-to-server), but:
 *  - Paypur charges the order amount PLUS 0–99 random paise, so ₹2.00 may arrive as ₹2.37;
 *  - the status API may report paise (237 for ₹2.37).
 * A payment counts if it is at least the order amount and at most +₹0.99 — never less.
 * Otherwise the gateway's figure is passed on so finalize_paid_order() records a real mismatch.
 */
export function paidAmountFor(expected: number, signed: number | null, statusApi: number | null): number {
  const want = Math.round(expected * 100);
  const covers = (n: number | null) => {
    if (n == null || !Number.isFinite(n)) return false;
    const extra = Math.round(n * 100) - want;
    return extra >= 0 && extra <= GATEWAY_EXTRA_PAISE_MAX;
  };
  if (covers(signed)) return expected;
  if (covers(statusApi)) return expected;
  if (statusApi != null && covers(statusApi / 100)) return expected; // status API in paise
  return statusApi ?? signed ?? expected;
}

export type Finalized = { status: "paid" | "failed" | "pending" | "amount_mismatch" | "order_not_found" | "refunded"; orderId?: string; already?: boolean };

/**
 * Confirm an order with the gateway and finalize it. Used by the callback (after signature check)
 * and by "check payment status". `signedAmount` is the amount from a verified callback, when available.
 */
export async function confirmOrder(providerOrderId: string, txnId: string | null, opts: { signedStatus?: string; signedAmount?: number } = {}): Promise<Finalized> {
  const svc = createServiceClient();
  const cfg = await loadPaymentConfig();
  if (!cfg.creds) return { status: "pending" };
  const { data: order } = await svc.from("orders").select("id,amount,status,provider_txn_id").eq("provider_order_id", providerOrderId).maybeSingle();
  if (!order) return { status: "order_not_found" };
  if (order.status === "paid") return { status: "paid", orderId: order.id, already: true };
  const txn = txnId || order.provider_txn_id;

  let status = opts.signedStatus ?? null;
  let verifiedBy = "signature";
  let statusAmount: number | null = null;
  if (txn) {
    const st = await getPaymentStatus(cfg.creds, txn);
    if (st.known && st.status) {
      // The gateway's own answer wins over anything that came through the browser.
      status = st.status;
      statusAmount = st.amount;
      verifiedBy = opts.signedStatus ? "signature+status" : "status";
    } else if (!opts.signedStatus) {
      return { status: "pending", orderId: order.id }; // can't confirm without a signed callback or a status answer
    }
  }
  if (!status) return { status: "pending", orderId: order.id };
  if (isSuccessStatus(status)) {
    const amount = paidAmountFor(Number(order.amount), opts.signedAmount ?? null, statusAmount);
    console.info(`[paypur] confirm order=${providerOrderId.slice(0, 12)} expected=${Number(order.amount).toFixed(2)} signed=${opts.signedAmount ?? "-"} status_api=${statusAmount ?? "-"} using=${amount}`);
    const { data, error } = await svc.rpc("finalize_paid_order", { _provider_order_id: providerOrderId, _txn_id: txn, _paid_amount: amount, _verified_by: verifiedBy });
    if (error) { console.error("[payments] finalize failed", error.message); return { status: "pending", orderId: order.id }; }
    const r = data as { status: Finalized["status"]; order_id?: string; already?: boolean };
    return { status: r.status, orderId: r.order_id ?? order.id, already: r.already };
  }
  if (isFailureStatus(status)) {
    await svc.rpc("fail_order", { _provider_order_id: providerOrderId, _txn_id: txn, _reason: `gateway:${status}` });
    return { status: "failed", orderId: order.id };
  }
  return { status: "pending", orderId: order.id };
}
