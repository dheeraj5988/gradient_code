"use server";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { chargeAmount, loadPaymentConfig } from "@/lib/payments/config";
import { REF_COOKIE, confirmOrder, resolveReferral } from "@/lib/payments/order";
import { initPayment } from "@/lib/payments/paypur";
import { requestOrigin } from "@/lib/payments/origin";

const back = (slug: string, msg: string) => redirect(`/checkout/${slug}?error=${encodeURIComponent(msg)}`);

/** Free courses only. The enroll_free() RPC re-checks price & publish status in the database. */
export async function enrollFree(courseId: string, slug: string) {
  if (IS_DEMO) redirect(`/learn/${slug}`);
  const user = await getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_free", { _course_id: courseId });
  if (error) back(slug, error.message.includes("course_not_free") ? "This course is not free." : "Enrollment failed. Please try again.");
  redirect(`/learn/${slug}`);
}

/**
 * Start a Paypur payment. Everything that matters is decided on the server:
 * the price comes from the database (never the browser), the order is created with the
 * service role, and access is granted only later by the verified callback.
 */
export async function startPayment(courseId: string, slug: string, form: FormData) {
  if (IS_DEMO) back(slug, "Payments need a configured database.");
  const user = await getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);

  const firstname = String(form.get("firstname") ?? "").trim().replace(/\s+/g, " ");
  const phone = String(form.get("phone") ?? "").replace(/[\s-]/g, "").replace(/^(\+91|91)/, "");
  if (firstname.length < 2 || firstname.length > 60) back(slug, "Enter your full name.");
  if (!/^[6-9]\d{9}$/.test(phone)) back(slug, "Enter a valid 10-digit mobile number.");
  if (!user.email) back(slug, "Your account has no email address.");

  const cfg = await loadPaymentConfig();
  if (!cfg.creds || !cfg.enabled) back(slug, "Payments aren't available right now. Please try again later.");
  const creds = cfg.creds!;
  const svc = createServiceClient();

  const { data: course } = await svc.from("courses").select("id,title,slug,price,status,is_demo").eq("id", courseId).maybeSingle();
  if (!course || course.slug !== slug || course.status !== "published") back(slug, "This course isn't available for purchase.");
  const price = Number(course!.price);
  if (price <= 0) back(slug, "This course is free — use Enroll for free.");

  const { data: enrolled } = await createClient().then((s) => s.rpc("can_access_course", { _course_id: courseId }));
  if (enrolled === true) redirect(`/learn/${slug}`);

  const amount = chargeAmount(cfg, price);
  const ref = await resolveReferral((await cookies()).get(REF_COOKIE)?.value, user.id);
  const providerOrderId = `gc_${crypto.randomBytes(10).toString("hex")}`;
  const { data: order, error } = await svc
    .from("orders")
    .insert({ user_id: user.id, course_id: courseId, amount, list_amount: price, test_mode: cfg.testMode, status: "created", provider: "paypur", provider_order_id: providerOrderId, referral_code_id: ref })
    .select("id")
    .single();
  if (error || !order) { console.error("[checkout] order insert failed", error?.message); back(slug, "Couldn't start the payment. Please try again."); }

  // Best-effort: remember the phone number on the learner's profile.
  const supabase = await createClient();
  await supabase.from("profiles").update({ phone }).eq("id", user.id);

  const origin = await requestOrigin();
  const callback = `${origin}/api/paypur/callback`;
  const res = await initPayment(creds, { orderId: providerOrderId, amount, surl: callback, furl: callback, productinfo: course!.title, firstname, email: user.email!, phone });
  if (!res.ok) {
    await svc.from("orders").update({ status: "failed", failure_reason: `init:${res.error}`.slice(0, 200) }).eq("id", order!.id);
    back(slug, "The payment gateway couldn't start this payment. Please try again.");
  }
  if (res.ok) await svc.from("orders").update({ status: "pending", provider_txn_id: res.txnId }).eq("id", order!.id);
  redirect(res.ok ? res.payUrl : `/checkout/${slug}`);
}

/** "I've paid — check status": asks the gateway and finalizes if it confirms. */
export async function checkPaymentStatus(slug: string, orderId: string) {
  const user = await getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  const svc = createServiceClient();
  const { data: o } = await svc.from("orders").select("provider_order_id,user_id").eq("id", orderId).maybeSingle();
  if (o && o.user_id === user.id && o.provider_order_id) await confirmOrder(o.provider_order_id, null);
  redirect(`/checkout/${slug}/result?order=${orderId}`);
}
