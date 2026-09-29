import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Infinity as InfinityIcon, Lock, RefreshCw, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button, ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Input, Label } from "@/components/ui/input";
import { CourseThumb } from "@/components/course-thumb";
import { getCourseBySlug } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { chargeAmount, loadPaymentConfig } from "@/lib/payments/config";
import { discountPercent, formatPrice } from "@/lib/utils";
import { enrollFree, startPayment } from "./actions";

export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ error?: string }> }) {
  const course = await getCourseBySlug((await params).slug);
  const { error } = await searchParams;
  if (!course) notFound();
  const off = discountPercent(course.price, course.mrp);
  const cfg = IS_DEMO ? null : await loadPaymentConfig();
  const canPay = !!cfg && cfg.enabled && cfg.hasCredentials;
  const charge = cfg ? chargeAmount(cfg, course.price) : course.price;
  const testing = !!cfg && cfg.testMode && course.price > 0;
  const user = IS_DEMO ? null : await getUser();
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="container-page flex h-16 items-center justify-between">
          <Logo />
          <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden />Secure checkout</span>
        </div>
      </header>
      <main id="main" className="container-page py-8 sm:py-10">
        <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.title, href: `/courses/${course.slug}` }, { label: "Checkout" }]} />
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Checkout</h1>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="mb-4 text-sm font-semibold">Order details</h2>
              <div className="flex flex-col gap-4 sm:flex-row">
                <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} className="w-full shrink-0 rounded-lg sm:w-44" />
                <div className="min-w-0">
                  <p className="font-semibold">{course.title}</p>
                  {course.instructor ? <p className="text-sm text-muted-foreground">{course.instructor.name}</p> : null}
                  <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">{course.access_policy === "lifetime" ? <InfinityIcon className="h-4 w-4" aria-hidden /> : <RefreshCw className="h-4 w-4" aria-hidden />}{course.access_policy === "lifetime" ? "Lifetime access" : `${course.access_days} days of access`}</li>
                    {course.includes.certificate !== false ? <li className="flex items-center gap-2"><Award className="h-4 w-4" aria-hidden />Certificate on meeting requirements</li> : null}
                  </ul>
                </div>
              </div>
            </section>
          </div>
          <aside>
            <div className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-6">
              <h2 className="text-sm font-semibold">Order summary</h2>
              <dl className="space-y-2.5 text-sm">
                {off ? <div className="flex justify-between text-muted-foreground"><dt>Original price</dt><dd className="tabular-nums line-through">{formatPrice(course.mrp!)}</dd></div> : null}
                {off ? <div className="flex justify-between text-success"><dt>Discount ({off}%)</dt><dd className="tabular-nums">−{formatPrice(course.mrp! - course.price)}</dd></div> : null}
                <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd className="tabular-nums">{formatPrice(charge)}</dd></div>
                {testing ? <p className="text-xs text-muted-foreground">Test pricing is on: listed price {formatPrice(course.price)}, charged {formatPrice(charge)}.</p> : null}
              </dl>
              {error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}
              {course.price === 0 ? (
                <form action={enrollFree.bind(null, course.id, course.slug)}><Button size="lg" className="w-full">Enroll for free</Button></form>
              ) : !canPay ? (
                <>
                  <Button size="lg" className="w-full" disabled>Payments unavailable</Button>
                  <p className="text-center text-xs text-muted-foreground">Online payment isn&apos;t switched on yet. Please check back soon.</p>
                </>
              ) : !user ? (
                <ButtonLink size="lg" className="w-full" href={`/login?next=/checkout/${course.slug}`}>Sign in to pay</ButtonLink>
              ) : (
                <form action={startPayment.bind(null, course.id, course.slug)} className="space-y-3">
                  <div><Label htmlFor="firstname">Full name</Label><Input id="firstname" name="firstname" autoComplete="name" required minLength={2} maxLength={60} defaultValue="" /></div>
                  <div><Label htmlFor="phone">Mobile number</Label><Input id="phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" required pattern="(\+?91)?[6-9][0-9]{9}" placeholder="10-digit UPI-linked number" /></div>
                  <Button size="lg" className="w-full">Pay {formatPrice(charge)} with UPI</Button>
                </form>
              )}
              {testing && canPay ? <p className="rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">Test mode: this purchase is charged {formatPrice(charge)} only.</p> : null}
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" aria-hidden />Secure UPI payment via Paypur</p>
              <p className="text-center text-xs text-muted-foreground">By purchasing you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund" className="underline">Refund policy</Link>.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
