import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, Check, IndianRupee, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { stipendText } from "@/components/internship/internship-card";
import { getInternship } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { getInternshipEligibility } from "@/lib/data/applications";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const i = await getInternship(slug);
  return i ? { title: `${i.title} — ${i.company}`, description: i.description.slice(0, 160), alternates: { canonical: `/internships/${slug}` } } : { title: "Internship not found" };
}

export default async function InternshipDetail({ params }: { params: Params }) {
  const i = await getInternship((await params).slug);
  if (!i) notFound();
  const user = IS_DEMO ? null : await getUser();
  const elig = user ? await getInternshipEligibility(i.id) : null;
  const closed = i.apply_by ? new Date(i.apply_by + "T23:59:59") < new Date() : false;
  const facts = [
    { icon: MapPin, label: "Location", value: `${i.location}` },
    { icon: Calendar, label: "Duration", value: `${i.duration_weeks} weeks` },
    { icon: IndianRupee, label: "Stipend", value: stipendText(i) },
    { icon: Users, label: "Openings", value: String(i.openings) },
  ];
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Internships", href: "/internships" }, { label: i.title }]} />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-8">
          <div>
            <h1 className="text-3xl font-bold">{i.title}</h1>
            <p className="mt-1 text-muted-foreground">{i.company} · {i.mode}</p>
          </div>
          <dl className="grid grid-cols-2 gap-4 rounded-xl border border-border p-5 sm:grid-cols-4">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="flex items-center gap-1.5 text-xs text-subtle-foreground"><f.icon className="h-3.5 w-3.5" aria-hidden />{f.label}</dt>
                <dd className="mt-1 text-sm font-semibold">{f.value}</dd>
              </div>
            ))}
          </dl>
          <section><h2 className="mb-2 text-xl font-bold">About the internship</h2><p className="text-muted-foreground">{i.description}</p></section>
          {i.responsibilities.length ? <section><h2 className="mb-3 text-xl font-bold">Responsibilities</h2><ul className="space-y-2">{i.responsibilities.map((r) => <li key={r} className="flex gap-2.5 text-sm text-muted-foreground"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{r}</li>)}</ul></section> : null}
          {i.skills.length ? <section><h2 className="mb-3 text-xl font-bold">Skills required</h2><ul className="flex flex-wrap gap-2">{i.skills.map((s) => <li key={s}><Badge className="px-2.5 py-1 text-sm">{s}</Badge></li>)}</ul></section> : null}
          {i.perks.length ? <section><h2 className="mb-3 text-xl font-bold">Perks</h2><ul className="flex flex-wrap gap-2">{i.perks.map((s) => <li key={s}><Badge tone="success" className="px-2.5 py-1 text-sm">{s}</Badge></li>)}</ul></section> : null}
          <section>
            <h2 className="mb-3 text-xl font-bold">Application process</h2>
            <ol className="grid gap-3 sm:grid-cols-4">
              {["Apply", "Profile review", "Interview", "Decision"].map((s, n) => (
                <li key={s} className="rounded-lg border border-border p-3 text-sm"><span className="text-xs text-subtle-foreground">Step {n + 1}</span><p className="font-medium">{s}</p></li>
              ))}
            </ol>
          </section>
        </div>
        <aside>
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-20">
            <h2 className="font-semibold">Eligibility</h2>
            {i.required_course_slug ? (
              <p className="text-sm text-muted-foreground">Complete the <Link href={`/courses/${i.required_course_slug}`} className="font-medium text-primary hover:underline">linked course</Link> and its certificate requirements to become eligible.</p>
            ) : (
              <p className="text-sm text-muted-foreground">Open to all Gradient Code learners.</p>
            )}
            {i.apply_by ? <p className="text-sm">Apply by <strong>{new Date(i.apply_by).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</strong></p> : null}
            {IS_DEMO ? <p className="text-sm text-muted-foreground">Applications open once the site is connected to its database.</p>
              : !user ? <ButtonLink href={`/login?next=/dashboard/applications?apply=${i.slug}`} size="lg" className="w-full">Sign in to apply</ButtonLink>
              : elig?.applied ? <ButtonLink href="/dashboard/applications" variant="outline" size="lg" className="w-full">Applied — track status</ButtonLink>
              : closed || elig?.open === false ? <p className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Applications are closed.</p>
              : elig && elig.course_met === false ? <p className="rounded-lg bg-surface-2 px-3 py-2 text-sm text-muted-foreground">You&apos;ll be able to apply once you&apos;ve earned the required certificate.</p>
              : <ButtonLink href={`/dashboard/applications?apply=${i.slug}`} size="lg" className="w-full">Apply now</ButtonLink>}
          </div>
        </aside>
      </div>
    </div>
  );
}
