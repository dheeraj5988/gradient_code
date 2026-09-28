import { notFound } from "next/navigation";
import { Award } from "lucide-react";
import { Panel, PortalPage } from "@/components/learn/portal";
import { EligibilityPlaceholder } from "@/components/learn/eligibility-placeholder";
import { getLearningContext, getPractice } from "@/lib/data/learning";

export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const enrolled = ctx.access === "enrolled";
  const practice = enrolled ? await getPractice(ctx.course.id, ctx.userId) : null;
  // TODO(antigravity, Phase 5): certificate_policies + server-side eligibility + issuance.
  return (
    <PortalPage title="Certificate" description="Certificates are earned by meeting this course's requirements — not only by watching videos.">
      <Panel>
        <div className="mb-4 flex items-center gap-3">
          <Award className="h-6 w-6 text-primary" aria-hidden />
          <p className="text-sm text-muted-foreground">Your current progress towards the typical requirements. Exact thresholds will be set per course.</p>
        </div>
        <EligibilityPlaceholder
          items={[
            { label: "Lessons completed", value: enrolled ? `${ctx.progress.completed} / ${ctx.progress.total}` : undefined, done: enrolled && ctx.progress.total > 0 && ctx.progress.completed === ctx.progress.total },
            { label: "Practice questions solved", value: practice?.stats.total ? `${practice.stats.solved} / ${practice.stats.total}` : undefined },
            { label: "Quizzes & final assessment" },
            { label: "Required projects" },
          ]}
          note="Certificate eligibility is verified on the server. It will be enabled once requirements are configured for this course."
        />
      </Panel>
    </PortalPage>
  );
}
