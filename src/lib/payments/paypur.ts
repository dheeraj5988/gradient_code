import "server-only";
import crypto from "node:crypto";

/**
 * Paypur UPI gateway client (https://upi.paypur.in — docs supplied by the owner).
 *  init:      POST /api/merchant/init      header X-PAYPUR-KEY, body signed with HMAC_SHA256(order_id|amount|surl|furl, salt)
 *  status:    GET  /api/merchant/status?txn_id=…   header X-PAYPUR-KEY
 *  callback:  redirect to surl/furl with order_id, txn_id, status, amount, signature
 *             signature = HMAC_SHA256(txn_id|order_id|status|amount, salt)
 * "Gateway Key" in the Paypur dashboard = X-PAYPUR-KEY; "Gateway Salt" = signing secret.
 */
export const PAYPUR_BASE = (process.env.PAYPUR_BASE_URL || "https://upi.paypur.in").replace(/\/$/, "");

export type Creds = { key: string; salt: string };

export const formatAmount = (n: number) => n.toFixed(2);

const hmac = (salt: string, parts: string[]) => crypto.createHmac("sha256", salt).update(parts.join("|"), "utf8").digest("hex");

export const signInit = (salt: string, orderId: string, amount: string, surl: string, furl: string) => hmac(salt, [orderId, amount, surl, furl]);
export const signCallback = (salt: string, txnId: string, orderId: string, status: string, amount: string) => hmac(salt, [txnId, orderId, status, amount]);

export function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a.toLowerCase(), "utf8");
  const y = Buffer.from(b.toLowerCase(), "utf8");
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

const SUCCESS = new Set(["success", "successful", "completed", "complete", "paid", "captured", "credit"]);
const FAILURE = new Set(["failed", "failure", "fail", "cancelled", "canceled", "rejected", "expired", "declined", "error"]);
/** Normalises gateway spellings: "TXN_SUCCESS", "Success", "PAYMENT-FAILED" → success / failed. */
const norm = (s: string) => s.trim().toLowerCase().replace(/^(txn|transaction|payment)[_\s-]*/, "").replace(/[_\s-]+(txn|transaction|payment)$/, "");
export const isSuccessStatus = (s: string) => SUCCESS.has(norm(s));
export const isFailureStatus = (s: string) => { const n = norm(s); return FAILURE.has(n) || /fail|cancel|expire|reject|declin/.test(n); };

export type InitInput = { orderId: string; amount: number; surl: string; furl: string; productinfo: string; firstname: string; email: string; phone: string };
export type InitResult = { ok: true; payUrl: string; txnId: string | null } | { ok: false; error: string };

export async function initPayment(creds: Creds, i: InitInput): Promise<InitResult> {
  const amount = formatAmount(i.amount);
  const body = {
    order_id: i.orderId,
    amount,
    surl: i.surl,
    furl: i.furl,
    productinfo: i.productinfo.slice(0, 100),
    firstname: i.firstname,
    email: i.email,
    phone: i.phone,
    signature: signInit(creds.salt, i.orderId, amount, i.surl, i.furl),
  };
  try {
    const res = await fetch(`${PAYPUR_BASE}/api/merchant/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-PAYPUR-KEY": creds.key },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; pay_url?: string; txn_id?: string; txnId?: string; error?: string; message?: string } | null;
    if (!res.ok || !data?.ok || !data.pay_url) {
      console.error("[paypur] init failed", res.status, data?.error ?? data?.message ?? "");
      return { ok: false, error: data?.error || data?.message || `Gateway error (${res.status})` };
    }
    const url = new URL(data.pay_url);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !local) return { ok: false, error: "Gateway returned an insecure payment URL." };
    return { ok: true, payUrl: url.toString(), txnId: data.txn_id ?? data.txnId ?? null };
  } catch (e) {
    console.error("[paypur] init error", e instanceof Error ? e.message : e);
    return { ok: false, error: "Couldn't reach the payment gateway. Please try again." };
  }
}

export type StatusResult = { known: boolean; status: string | null; amount: number | null };

/** Server-to-server status check. Never throws; `known:false` when the gateway can't be queried. */
export async function getPaymentStatus(creds: Creds, txnId: string): Promise<StatusResult> {
  try {
    const res = await fetch(`${PAYPUR_BASE}/api/merchant/status?txn_id=${encodeURIComponent(txnId)}`, {
      headers: { "X-PAYPUR-KEY": creds.key },
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
    const d = (await res.json().catch(() => null)) as { status?: string; amount?: string | number; data?: { status?: string; amount?: string | number } } | null;
    const status = d?.status ?? d?.data?.status;
    // Safe diagnostic: HTTP code, reply field names and the status word (no keys, no amounts).
    console.info(`[paypur] status http=${res.status} fields=${d ? Object.keys(d).sort().join(",") : "non-json"}${d?.data && typeof d.data === "object" ? ` data.fields=${Object.keys(d.data).sort().join(",")}` : ""} status=${typeof status === "string" ? status.slice(0, 20) : "none"}`);
    if (!res.ok) return { known: false, status: null, amount: null };
    const amt = d?.amount ?? d?.data?.amount;
    if (typeof status !== "string") return { known: false, status: null, amount: null };
    const n = amt == null ? null : Number(amt);
    return { known: true, status, amount: n != null && Number.isFinite(n) ? n : null };
  } catch {
    return { known: false, status: null, amount: null };
  }
}
