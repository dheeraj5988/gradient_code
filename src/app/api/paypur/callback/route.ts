import { NextRequest, NextResponse } from "next/server";
import { createServiceClient, serviceConfigured } from "@/lib/supabase/service";
import { loadPaymentConfig } from "@/lib/payments/config";
import { confirmOrder } from "@/lib/payments/order";
import { safeEqualHex, signCallback } from "@/lib/payments/paypur";
import { originFrom } from "@/lib/payments/origin";

export const dynamic = "force-dynamic";

/**
 * Paypur redirects the payer here (surl and furl). We never trust the browser:
 *  1. verify HMAC_SHA256(txn_id|order_id|status|amount, salt) with a timing-safe compare,
 *  2. re-confirm with Paypur's status API,
 *  3. finalize_paid_order() checks the amount against OUR order and is idempotent.
 */
async function handle(req: NextRequest, q: URLSearchParams, method: "GET" | "POST") {
  // Send the buyer back to the domain Paypur returned them to (never a protected preview domain from env).
  const origin = originFrom(req.headers.get("x-forwarded-host") ?? req.headers.get("host"), req.headers.get("x-forwarded-proto")) ?? req.nextUrl.origin;
  const go = (path: string) => NextResponse.redirect(`${origin}${path}`, { status: 303, headers: { "Cache-Control": "no-store" } });
  const orderRef = q.get("order_id") ?? "";
  const txnId = q.get("txn_id") ?? "";
  const status = q.get("status") ?? "";
  const amountStr = q.get("amount") ?? "";
  const signature = q.get("signature") ?? "";

  if (!serviceConfigured()) return go("/dashboard?payment=unavailable");
  const cfg = await loadPaymentConfig();
  if (!cfg.creds) return go("/dashboard?payment=unavailable");
  if (!orderRef || !txnId || !status || !amountStr || !signature) return go("/dashboard?payment=invalid");

  const sigOk = safeEqualHex(signCallback(cfg.creds.salt, txnId, orderRef, status, amountStr), signature);
  // One safe diagnostic line: shows Paypur's real return format in the Vercel logs (field names only, no values).
  console.info(`[paypur] callback method=${method} fields=${[...new Set(q.keys())].sort().join(",")} status=${status.slice(0, 20)} sig=${sigOk ? "ok" : "bad"}`);
  if (!sigOk) {
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


export async function GET(req: NextRequest) {
  return handle(req, req.nextUrl.searchParams, "GET");
}

/** Many UPI gateways return the payer with an HTML form POST to surl/furl — same verification as GET. */
export async function POST(req: NextRequest) {
  const q = new URLSearchParams(req.nextUrl.searchParams);
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const j = (await req.json()) as Record<string, unknown>;
      for (const [k, v] of Object.entries(j ?? {})) if (v != null && typeof v !== "object") q.set(k, String(v));
    } else {
      const f = await req.formData();
      for (const [k, v] of f.entries()) if (typeof v === "string") q.set(k, v);
    }
  } catch {
    // Unreadable body: fall through with query params only (verification will reject it).
  }
  return handle(req, q, "POST");
}
