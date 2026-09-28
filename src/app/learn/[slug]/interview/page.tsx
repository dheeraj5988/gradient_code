import { notFound } from "next/navigation";
import { MessagesSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { LockedState, Panel, PortalPage } from "@/components/learn/portal";
import { DifficultyBadge } from "@/components/practice/bits";
import { ReviewToggle } from "@/components/interview/review-toggle";
import { getLearningContext, getPractice, getReviewStatuses } from "@/lib/data/learning";

export default async function InterviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="Interview prep"><LockedState slug={slug} what="interview preparation" /></PortalPage>;
  const data = await getPractice(ctx.course.id, ctx.userId, "interview");
  if (!data.questions.length) {
    return <PortalPage title="Interview prep" description="Common interview questions for this course's topics."><EmptyState icon={MessagesSquare} title="No interview questions yet" description="Interview questions will appear here when your instructor publishes them." /></PortalPage>;
  }
  const statuses = await getReviewStatuses(ctx.userId, data.questions.map((q) => q.id));
  const counts = { reviewed: 0, confident: 0 };
  data.questions.forEach((q) => { const s = statuses.get(q.id); if (s === "reviewed") counts.reviewed++; if (s === "confident") counts.confident++; });
  const topicName = (id: string | null) => data.topics.find((t) => t.id === id)?.name ?? "General";
  const groups = new Map<string, typeof data.questions>();
  data.questions.forEach((q) => groups.set(topicName(q.topic_id), [...(groups.get(topicName(q.topic_id)) ?? []), q]));

  return (
    <PortalPage title="Interview prep" description="Practise explaining concepts out loud, then mark how confident you feel.">
      <Panel className="mb-6">
        <dl className="grid grid-cols-3 gap-4 text-center">
          <div><dt className="text-xs text-muted-foreground">Questions</dt><dd className="text-xl font-bold tabular-nums">{data.questions.length}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Reviewed</dt><dd className="text-xl font-bold tabular-nums">{counts.reviewed}</dd></div>
          <div><dt className="text-xs text-muted-foreground">Confident</dt><dd className="text-xl font-bold text-success tabular-nums">{counts.confident}</dd></div>
        </dl>
      </Panel>
      <Accordion>
        {[...groups.entries()].map(([topic, qs], i) => (
          <AccordionItem key={topic} title={topic} meta={`${qs.length} question${qs.length > 1 ? "s" : ""}`} defaultOpen={i === 0}>
            <ul className="divide-y divide-border bg-background">
              {qs.map((q) => (
                <li key={q.id} className="space-y-3 px-4 py-4 sm:px-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{q.title}</h3>
                    <DifficultyBadge d={q.difficulty} />
                    {q.role ? <span className="text-xs text-muted-foreground">{q.role}</span> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{q.prompt}</p>
                  <ReviewToggle slug={slug} questionId={q.id} status={(statuses.get(q.id) as "not_reviewed" | "reviewed" | "confident") ?? "not_reviewed"} />
                </li>
              ))}
            </ul>
          </AccordionItem>
        ))}
      </Accordion>
    </PortalPage>
  );
}
