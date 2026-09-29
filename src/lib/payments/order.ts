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
  let amount = opts.signedAmount ?? null;
  let verifiedBy = "signature";
  if (txn) {
    const st = await getPaymentStatus(cfg.creds, txn);
    if (st.known && st.status) {
      // The gateway's own answer wins over anything that came through the browser.
      status = st.status;
      if (st.amount != null) amount = st.amount;
      verifiedBy = opts.signedStatus ? "signature+status" : "status";
    } else if (!opts.signedStatus) {
      return { status: "pending", orderId: order.id }; // can't confirm without a signed callback or a status answer
    }
  }
  if (!status) return { status: "pending", orderId: order.id };
  if (isSuccessStatus(status)) {
    const { data, error } = await svc.rpc("finalize_paid_order", { _provider_order_id: providerOrderId, _txn_id: txn, _paid_amount: amount ?? Number(order.amount), _verified_by: verifiedBy });
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
