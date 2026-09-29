import { redirect } from "next/navigation";
import { AlertCircle, BadgeCheck, UserRound } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata = { title: "Profile" };
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = IS_DEMO ? null : await getUser();
  if (!IS_DEMO && !user) redirect("/login?next=/dashboard/profile");
  const verifiedAt = user?.email_confirmed_at ? new Date(user.email_confirmed_at) : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Profile</h1>
        <p className="mt-1 text-muted-foreground">Your learner profile is used for certificates and internship applications.</p>
      </div>
      {user ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-sm font-semibold">Account</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Name</dt><dd className="font-medium break-words">{(user.user_metadata?.full_name as string) || "—"}</dd></div>
            <div className="min-w-0"><dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="flex flex-wrap items-center gap-2 font-medium"><span className="break-all">{user.email}</span>
                {verifiedAt ? <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-xs font-medium text-success"><BadgeCheck className="h-3.5 w-3.5" aria-hidden />Verified</span>
                  : <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning"><AlertCircle className="h-3.5 w-3.5" aria-hidden />Not verified</span>}
              </dd>
              {verifiedAt ? <p className="mt-1 text-xs text-muted-foreground">Verified on {verifiedAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</p>
                : <ButtonLink href="/verify-email?reason=required&next=/dashboard/profile" size="sm" variant="outline" className="mt-2">Verify email</ButtonLink>}
            </div>
          </dl>
        </section>
      ) : null}
      {/* TODO(antigravity, Phase 7): editable learner profile (headline, skills, education, GitHub, LinkedIn, resume) */}
      <EmptyState icon={UserRound} title="Profile editing is coming soon" description="You'll be able to add your skills, links and resume here." />
    </div>
  );
}
