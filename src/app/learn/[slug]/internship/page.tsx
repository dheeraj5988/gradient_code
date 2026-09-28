import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel, PortalPage } from "@/components/learn/portal";
import { EligibilityPlaceholder } from "@/components/learn/eligibility-placeholder";
import { getLearningContext } from "@/lib/data/learning";
import { getInternships } from "@/lib/data/queries";

export default async function InternshipPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const linked = (await getInternships()).filter((i) => i.required_course_slug === slug);
  // TODO(antigravity, Phase 6): internship_policies + eligibility engine + application form.
  return (
    <PortalPage title="Internship" description="Complete this course's requirements to become eligible for linked internships.">
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Eligibility">
          <EligibilityPlaceholder
            items={[{ label: "Certificate earned" }, { label: "Projects approved" }, { label: "Profile complete" }, { label: "Resume uploaded" }]}
            note="Requirements will be configured per internship. Nothing is decided automatically yet."
          />
        </Panel>
        <Panel title="Linked internships">
          {linked.length ? (
            <ul className="space-y-3">
              {linked.map((i) => (
                <li key={i.id}><Link href={`/internships/${i.slug}`} className="block rounded-lg border border-border p-3 hover:border-primary/40"><p className="text-sm font-semibold">{i.title}</p><p className="text-xs text-muted-foreground">{i.company} · {i.mode} · {i.duration_weeks} weeks</p></Link></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">No internships are linked to this course yet. <Link href="/internships" className="text-primary hover:underline">Browse all internships</Link>.</p>}
        </Panel>
      </div>
    </PortalPage>
  );
}
