import Link from "next/link";
import { notFound } from "next/navigation";
import { Bookmark } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LockedState, PortalPage } from "@/components/learn/portal";
import { QuestionRow } from "@/components/practice/question-row";
import { getLearningContext, getPractice } from "@/lib/data/learning";
import { cn } from "@/lib/utils";

export default async function SavedPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ filter?: string }> }) {
  const { slug } = await params;
  const { filter = "all" } = await searchParams;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="Saved questions"><LockedState slug={slug} what="saved questions" /></PortalPage>;
  const data = await getPractice(ctx.course.id, ctx.userId);
  const saved = data.questions.filter((q) => q.saved);
  const list = filter === "solved" ? saved.filter((q) => q.state === "correct") : filter === "unsolved" ? saved.filter((q) => q.state !== "correct") : saved;
  const topicName = (id: string | null) => data.topics.find((t) => t.id === id)?.name ?? "General";

  return (
    <PortalPage title="Saved questions" description="Questions you bookmarked to revisit.">
      {saved.length ? (
        <>
          <div className="mb-4 flex gap-1 text-sm" role="group" aria-label="Filter saved questions">
            {[["all", "All"], ["unsolved", "Unsolved"], ["solved", "Solved"]].map(([f, label]) => (
              <Link key={f} href={f === "all" ? "?" : `?filter=${f}`} aria-current={filter === f ? "true" : undefined} className={cn("rounded-md px-3 py-1.5", filter === f ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-surface-2")}>{label}</Link>
            ))}
          </div>
          {list.length ? (
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
              {list.map((q) => <QuestionRow key={q.id} slug={slug} q={q} meta={`${topicName(q.topic_id)}${q.savedAt ? ` · Saved ${new Date(q.savedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}`} />)}
            </ul>
          ) : <EmptyState title={`No ${filter} saved questions`} />}
        </>
      ) : (
        <EmptyState icon={Bookmark} title="No saved questions yet" description="Use the bookmark icon on any question to save it here." action={<ButtonLink href={`/learn/${slug}/practice`} variant="outline" size="sm">Go to practice</ButtonLink>} />
      )}
    </PortalPage>
  );
}
