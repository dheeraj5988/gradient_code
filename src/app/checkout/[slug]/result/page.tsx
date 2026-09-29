import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { checkPaymentStatus } from "../actions";

export const metadata: Metadata = { title: "Payment status", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function ResultPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ order?: string }> }) {
  const { slug } = await params;
  const { order: orderId } = await searchParams;
  if (IS_DEMO || !orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) notFound();
  const user = await getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}/result?order=${orderId}`);

  // Service role read, but strictly scoped to the signed-in buyer's own order.
  const svc = createServiceClient();
  const { data: o } = await svc.from("orders").select("id,user_id,status,amount,test_mode,failure_reason,courses(title,slug)").eq("id", orderId).maybeSingle();
  if (!o || o.user_id !== user.id) notFound();
  const course = (Array.isArray(o.courses) ? o.courses[0] : o.courses) as { title: string; slug: string } | null;
  if (!course || course.slug !== slug) notFound();

  const state = o.status === "paid" ? "paid" : o.status === "failed" ? "failed" : o.status === "refunded" ? "refunded" : "pending";
  const Icon = state === "paid" ? CheckCircle2 : state === "pending" ? Clock : XCircle;
  const tone = state === "paid" ? "text-success bg-success-soft" : state === "pending" ? "text-warning bg-warning-soft" : "text-danger bg-danger-soft";
  const title = { paid: "Payment successful", pending: "Waiting for confirmation", failed: "Payment didn't go through", refunded: "This payment was refunded" }[state];
  const text = {
    paid: `You now have access to ${course.title}.`,
    pending: "Your bank or UPI app hasn't confirmed this payment yet. If money was debited, it will be confirmed shortly — press the button to check again.",
    failed: "No access was granted and you were not charged for this order. You can try again.",
    refunded: "Access for this order has been removed.",
  }[state];

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background"><div className="container-page flex h-16 items-center"><Logo /></div></header>
      <main id="main" className="container-page py-12">
        <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm">
          <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${tone}`}><Icon className="h-6 w-6" aria-hidden /></span>
          <h1 className="mt-4 text-xl font-bold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{text}</p>
          <p className="mt-3 text-xs text-muted-foreground tabular-nums">Order {o.id.slice(0, 8)} · {formatPrice(Number(o.amount))}{o.test_mode ? " · test payment" : ""}</p>
          <div className="mt-6 flex flex-col gap-2">
            {state === "paid" ? <ButtonLink size="lg" href={`/learn/${slug}`}>Start learning</ButtonLink> : null}
            {state === "pending" ? <form action={checkPaymentStatus.bind(null, slug, o.id)}><Button size="lg" className="w-full">Check payment status</Button></form> : null}
            {state === "failed" ? <ButtonLink size="lg" href={`/checkout/${slug}`}>Try again</ButtonLink> : null}
            <ButtonLink variant="outline" href="/dashboard">Go to dashboard</ButtonLink>
          </div>
        </div>
      </main>
    </div>
  );
}
