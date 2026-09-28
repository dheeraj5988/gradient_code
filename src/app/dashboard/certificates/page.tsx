import { Award } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Certificates" };

export default function CertificatesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Certificates</h1>
      <p className="mt-1 text-muted-foreground">Certificates you earn appear here with a credential ID and verification link.</p>
      {/* TODO(antigravity, Phase 6): list certificates rows, PDF download, share + verify link */}
      <EmptyState className="mt-8" icon={Award} title="No certificates yet" description="Meet a course's completion requirements to earn a verifiable certificate." action={<ButtonLink href="/dashboard/courses" variant="outline" size="sm">Go to my courses</ButtonLink>} />
    </div>
  );
}
