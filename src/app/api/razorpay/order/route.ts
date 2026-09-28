import { NextResponse } from "next/server";

/**
 * TODO(antigravity): implement.
 * 1. getUser() — 401 if missing.
 * 2. Load course by slug (server), compute final amount (apply coupon server-side).
 * 3. Create Razorpay order via REST (basic auth RAZORPAY_KEY_ID:RAZORPAY_KEY_SECRET), amount in paise.
 * 4. Insert into public.orders (status 'created', razorpay_order_id).
 * 5. Return { orderId, amount, keyId }.
 * A separate /api/razorpay/verify route checks the HMAC signature, marks the order 'paid'
 * and inserts the enrollment with the service-role client. Also add a webhook route.
 */
export async function POST() {
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}
