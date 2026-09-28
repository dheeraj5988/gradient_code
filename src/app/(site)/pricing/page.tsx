import type { Metadata } from "next";
import { Check } from "lucide-react";
import { SectionHeading } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Pricing" };

const PLANS = [
  { name: "Single course", price: "From ₹999", note: "one-time", features: ["Lifetime access to one course", "Certificate of completion", "Doubt forum", "Downloadable resources"], cta: "Browse courses", href: "/courses" },
  { name: "Career track", price: "₹14,999", note: "one-time", popular: true, features: ["All courses in one track", "Mentor project reviews", "Internship eligibility", "Resume & LinkedIn review", "Priority support"], cta: "Choose a track", href: "/courses" },
  { name: "All-access", price: "₹2,499", note: "per month", features: ["Every course on the platform", "New courses as they launch", "Certificates for each course", "Cancel anytime"], cta: "Coming soon", href: "/contact" },
];

export default function PricingPage() {
  return (
    <div className="container-page py-16">
      <SectionHeading eyebrow="Pricing" title="Simple, honest pricing" subtitle="Buy one course, commit to a career track, or learn everything." />
      {/* TODO(antigravity): move plans to a `plans` table; wire Career track + subscription to Razorpay. */}
      <div className="mt-12 grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.name} className={cn("relative flex flex-col rounded-3xl border border-border bg-card p-8", p.popular && "gradient-border-static glow")}>
            {p.popular ? <span className="gradient-fill absolute -top-3 left-8 rounded-full px-3 py-1 text-xs font-semibold">Most popular</span> : null}
            <h2 className="text-lg font-semibold">{p.name}</h2>
            <p className="mt-4"><span className="text-4xl font-bold">{p.price}</span> <span className="text-sm text-muted-foreground">{p.note}</span></p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2"><Check className="h-4 w-4 text-success" />{f}</li>)}</ul>
            <ButtonLink href={p.href} variant={p.popular ? "primary" : "outline"} className="mt-8 w-full">{p.cta}</ButtonLink>
          </div>
        ))}
      </div>
    </div>
  );
}
