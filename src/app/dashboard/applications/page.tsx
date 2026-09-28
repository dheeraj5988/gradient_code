import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Applications" };

export default function ApplicationsPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Internship applications</h1>
      <p className="mt-1 text-muted-foreground">Track the status of every internship you apply to.</p>
      {/* TODO(antigravity, Phase 7): application form (?apply=slug) + tracker timeline */}
      <EmptyState className="mt-8" icon={Briefcase} title="No applications yet" description="When you apply for an internship, you can follow its progress here." action={<ButtonLink href="/internships" variant="outline" size="sm">Browse internships</ButtonLink>} />
    </div>
  );
}
