import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { CourseThumb } from "@/components/course-thumb";
import { getCourseBySlug } from "@/lib/data/queries";
import { discountPercent, formatPrice } from "@/lib/utils";

export const metadata = { title: "Checkout" };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const course = await getCourseBySlug((await params).slug);
  if (!course) notFound();
  const off = discountPercent(course.price, course.mrp);
  const gst = 0; // TODO(antigravity): decide whether prices are GST-inclusive; show breakdown on invoice
  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <Logo />
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" />Secure checkout</span>
      </header>
      <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 md:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">Checkout</h1>
          <div className="flex gap-4 rounded-2xl border border-border p-4">
            <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} className="w-40 shrink-0 rounded-xl" />
            <div>
              <p className="font-semibold">{course.title}</p>
              <p className="text-sm text-muted-foreground">{course.instructor?.name}</p>
              <p className="mt-1 text-sm">{course.access_policy === "lifetime" ? "Lifetime access" : `${course.access_days} days access`}</p>
            </div>
          </div>
          <form className="flex gap-2">
            <input name="coupon" placeholder="Coupon code" className="h-11 flex-1 rounded-xl border border-border bg-surface px-4 text-sm uppercase" />
            <Button variant="outline" type="button">Apply</Button>
            {/* TODO(antigravity): validate coupon via server action using `coupons` table */}
          </form>
        </div>
        <aside className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
          <h2 className="font-semibold">Order summary</h2>
          <dl className="space-y-2 text-sm">
            {course.mrp ? <div className="flex justify-between text-muted-foreground"><dt>Original price</dt><dd className="line-through">{formatPrice(course.mrp)}</dd></div> : null}
            {off ? <div className="flex justify-between text-success"><dt>Discount ({off}%)</dt><dd>-{formatPrice(course.mrp! - course.price)}</dd></div> : null}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold"><dt>Total</dt><dd>{formatPrice(course.price + gst)}</dd></div>
          </dl>
          {/* TODO(antigravity): client component → POST /api/razorpay/order → open Razorpay Checkout → POST /api/razorpay/verify → enroll */}
          <Button size="lg" className="w-full" disabled>Pay {formatPrice(course.price)} (coming soon)</Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5" />UPI, cards, netbanking via Razorpay</p>
          <p className="text-center text-xs text-muted-foreground">By paying you agree to our <Link href="/terms" className="underline">Terms</Link> and <Link href="/refund" className="underline">Refund policy</Link>.</p>
        </aside>
      </div>
    </div>
  );
}
