import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Circle } from "lucide-react";
import { Panel, PortalPage } from "@/components/learn/portal";
import { getLearningContext } from "@/lib/data/learning";
import { getInternships } from "@/lib/data/queries";
import { getInternshipEligibility } from "@/lib/data/applications";
import { getEligibility } from "@/lib/data/certificates";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata = { title: "Internship" };
export const dynamic = "force-dynamic";

export default async function InternshipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const linked = (await getInternships()).filter((i) => i.required_course_slug === slug);
  const enrolled = ctx.access === "enrolled" && !IS_DEMO;
  const cert = enrolled ? await getEligibility(ctx.course.id) : null;
  const elig = enrolled ? await Promise.all(linked.map((i) => getInternshipEligibility(i.id))) : [];
  const hasCert = !!cert?.certificate && !cert.certificate.revoked;
  return (
    <PortalPage title="Internship" description="Internships linked to this course open to learners who have earned its certificate.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Your eligibility">
          <ul className="divide-y divide-border rounded-lg border border-border">
            <li className="flex items-center gap-3 px-4 py-3 text-sm">{hasCert ? <Check className="h-4 w-4 text-success" aria-label="Met" /> : <Circle className="h-4 w-4 text-subtle-foreground" aria-label="Not met" />}<span className="flex-1">Course certificate earned</span><span className="text-xs text-muted-foreground">{hasCert ? "Yes" : "Not yet"}</span></li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{hasCert ? "You can apply to the internships listed here." : <>Earn your certificate on the <Link className="text-primary underline" href={`/learn/${slug}/certificate`}>Certificate</Link> page to unlock applications.</>}</p>
        </Panel>
        <Panel title="Linked internships">
          {linked.length ? (
            <ul className="space-y-3">
              {linked.map((i, n) => (
                <li key={i.id}>
                  <Link href={`/internships/${i.slug}`} className="block rounded-lg border border-border p-3 hover:border-primary/40"><p className="text-sm font-semibold">{i.title}</p><p className="text-xs text-muted-foreground">{i.company} · {i.mode} · {i.duration_weeks} weeks</p>{elig[n]?.applied ? <p className="mt-1 text-xs text-success">Applied</p> : null}</Link>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No internships are linked to this course yet. <Link href="/internships" className="text-primary hover:underline">Browse all internships</Link>.</p>}
        </Panel>
      </div>
    </PortalPage>
  );
}
