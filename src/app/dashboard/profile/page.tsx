import { UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
      <p className="mt-1 text-muted-foreground">Your learner profile is used for certificates and internship applications.</p>
      {/* TODO(antigravity, Phase 7): editable learner profile (headline, skills, education, GitHub, LinkedIn, resume) */}
      <EmptyState className="mt-8" icon={UserRound} title="Profile editing is coming soon" description="You'll be able to add your skills, links and resume here." />
    </div>
  );
}
