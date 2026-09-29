import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, serviceConfigured } from "@/lib/supabase/service";
import { loadPaymentConfig } from "@/lib/payments/config";
import { confirmOrder } from "@/lib/payments/order";
import { safeEqualHex, signCallback } from "@/lib/payments/paypur";

export const dynamic = "force-dynamic";

/**
 * Paypur redirects the payer here (surl and furl). We never trust the browser:
 *  1. verify HMAC_SHA256(txn_id|order_id|status|amount, salt) with a timing-safe compare,
 *  2. re-confirm with Paypur's status API,
 *  3. finalize_paid_order() checks the amount against OUR order and is idempotent.
 */
export async function GET(req: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_SITE_URL && !/localhost/.test(process.env.NEXT_PUBLIC_SITE_URL) ? process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "") : req.nextUrl.origin;
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`, { status: 303, headers: { "Cache-Control": "no-store" } });
  const q = req.nextUrl.searchParams;
  const orderRef = q.get("order_id") ?? "";
  const txnId = q.get("txn_id") ?? "";
  const status = q.get("status") ?? "";
  const amountStr = q.get("amount") ?? "";
  const signature = q.get("signature") ?? "";

  if (!serviceConfigured()) return go("/dashboard?payment=unavailable");
  const cfg = await loadPaymentConfig();
  if (!cfg.creds) return go("/dashboard?payment=unavailable");
  if (!orderRef || !txnId || !status || !amountStr || !signature) return go("/dashboard?payment=invalid");

  if (!safeEqualHex(signCallback(cfg.creds.salt, txnId, orderRef, status, amountStr), signature)) {
    console.warn("[paypur] callback with invalid signature for", orderRef.slice(0, 40));
    return go("/dashboard?payment=invalid");
  }
  const amount = Number(amountStr);
  if (!Number.isFinite(amount)) return go("/dashboard?payment=invalid");

  const svc = createServiceClient();
  const { data: order } = await svc.from("orders").select("id,course:courses(slug)").eq("provider_order_id", orderRef).maybeSingle();
  if (!order) return go("/dashboard?payment=unknown");
  const slug = (order.course as unknown as { slug: string } | null)?.slug ?? "";

  const result = await confirmOrder(orderRef, txnId, { signedStatus: status, signedAmount: amount });
  return go(`/checkout/${slug}/result?order=${order.id}${result.status === "amount_mismatch" ? "&problem=amount" : ""}`);
}
