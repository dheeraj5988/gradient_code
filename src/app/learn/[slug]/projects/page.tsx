import { notFound } from "next/navigation";
import { FolderGit2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { PortalPage } from "@/components/learn/portal";
import { getLearningContext } from "@/lib/data/learning";

export default async function ProjectsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const n = ctx.course.includes.projects ?? 0;
  // TODO(antigravity, Phase 4): projects + project_submissions tables, submission form, review workflow.
  return (
    <PortalPage title="Projects" description="Hands-on projects you build, submit for review and keep in your portfolio.">
      <EmptyState icon={FolderGit2} title={n ? "Project submissions open soon" : "No projects yet"} description={n ? `This course includes ${n} project${n > 1 ? "s" : ""}. Briefs, rubrics and submission will appear here.` : "Projects for this course will appear here when they're published."} />
    </PortalPage>
  );
}
