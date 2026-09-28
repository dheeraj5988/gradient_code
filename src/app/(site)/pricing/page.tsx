import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Pricing", alternates: { canonical: "/pricing" } };

// TODO(antigravity, Phase 8): move plans to the database. Programs and all-access are not live yet.
const PLANS = [
  { name: "Single course", price: "Per course", note: "Pay once for the course you need.", features: ["Access period shown on the course page", "Certificate on meeting requirements", "Course resources and notes", "Free preview lessons before you buy"], cta: "Browse courses", href: "/courses", live: true },
  { name: "Career program", price: "Coming soon", note: "A structured bundle of courses for one career path.", features: ["All courses in the program", "Projects with mentor review", "Internship eligibility", "Career readiness tracking"], cta: "Explore programs", href: "/programs", live: false },
];

export default function PricingPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Pricing" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Pricing</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Simple, transparent pricing. Prices for each course are shown on the course page and at checkout.</p>
      <div className="mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
        {PLANS.map((p) => (
          <div key={p.name} className="flex flex-col rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">{p.name}</h2>
              {!p.live ? <Badge>Coming soon</Badge> : null}
            </div>
            <p className="mt-3 text-2xl font-bold">{p.price}</p>
            <p className="mt-1 text-sm text-muted-foreground">{p.note}</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">{p.features.map((f) => <li key={f} className="flex gap-2.5"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{f}</li>)}</ul>
            <ButtonLink href={p.href} variant={p.live ? "primary" : "outline"} className="mt-8 w-full">{p.cta}</ButtonLink>
          </div>
        ))}
      </div>
    </div>
  );
}
