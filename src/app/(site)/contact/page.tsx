import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ComingSoon } from "@/components/coming-soon";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getSiteSettings } from "@/lib/data/legal";

export const metadata: Metadata = { title: "Contact" };
export const dynamic = "force-dynamic";

export default async function Page() {
  const s = await getSiteSettings();
  if (!s?.support_email && !s?.support_phone && !s?.address) return <ComingSoon title="Contact" description="Questions about a course, payment or internship? We're here to help." />;
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Contact</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Questions about a course, payment or internship? Reach us here.</p>
      <ul className="mt-8 max-w-xl space-y-4 rounded-xl border border-border bg-card p-5 text-sm">
        {s.support_email ? <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-muted-foreground" aria-hidden /><a className="text-primary underline" href={`mailto:${s.support_email}`}>{s.support_email}</a></li> : null}
        {s.support_phone ? <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-muted-foreground" aria-hidden />{s.support_phone}</li> : null}
        {s.address ? <li className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden /><span className="whitespace-pre-line">{s.address}</span></li> : null}
      </ul>
    </div>
  );
}
