import { notFound } from "next/navigation";
import { ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { LockedState, PortalPage } from "@/components/learn/portal";
import { ProblemSheet } from "@/components/practice/problem-sheet";
import { getCodingSheet, getLearningContext } from "@/lib/data/learning";

export default async function ProblemsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const title = "Coding problems";
  if (ctx.access !== "enrolled") return <PortalPage title={title}><LockedState slug={slug} what="the coding problem sheet" /></PortalPage>;
  const sheet = await getCodingSheet(ctx.course.id, ctx.userId);
  const sections = [...ctx.modules.map((m) => ({ id: m.id, title: m.title })), { id: "course", title: "More practice" }];
  return (
    <PortalPage title={title} description="Hand-picked problems on LeetCode and HackerRank for this course. Solve them there, then tick them here to track your progress.">
      {sheet.error ? <ErrorState title="Couldn't load the problem sheet" description="Please try again in a moment." />
        : sheet.problems.length ? <ProblemSheet problems={sheet.problems} sections={sections} />
        : <EmptyState icon={ListChecks} title="No coding problems yet" description="Practice problems for this course will appear here." />}
    </PortalPage>
  );
}
