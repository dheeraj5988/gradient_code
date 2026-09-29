import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ButtonLink } from "@/components/ui/button";
import { ApplyForm } from "@/components/internship/apply-form";
import { WithdrawButton } from "@/components/internship/withdraw-button";
import { getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { getInternship } from "@/lib/data/queries";
import { getInternshipEligibility, listMyApplications } from "@/lib/data/applications";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { applied: "Applied", shortlisted: "Shortlisted", interview: "Interview", offered: "Offered", rejected: "Not selected", withdrawn: "Withdrawn" };
const TONE: Record<string, string> = { offered: "bg-success-soft text-success", rejected: "bg-danger-soft text-danger", withdrawn: "bg-surface-2 text-muted-foreground" };

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ apply?: string }> }) {
  const { apply } = await searchParams;
  const user = IS_DEMO ? null : await getUser();
  if (!IS_DEMO && !user) redirect(`/login?next=/dashboard/applications${apply ? `?apply=${apply}` : ""}`);
  const apps = user ? await listMyApplications(user.id) : [];
  const target = apply && /^[a-z0-9-]{1,120}$/.test(apply) ? await getInternship(apply) : null;
  const elig = target && !IS_DEMO ? await getInternshipEligibility(target.id) : null;
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div><h1 className="text-2xl font-bold sm:text-3xl">Internship applications</h1><p className="mt-1 text-muted-foreground">Apply and follow the status of every internship.</p></div>

      {target ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Apply: {target.title}</h2>
          <p className="text-sm text-muted-foreground">{target.company} · {target.mode}</p>
          <div className="mt-4">
            {IS_DEMO ? <p className="text-sm text-muted-foreground">Applications need a configured database.</p>
              : !elig || !elig.found ? <p className="text-sm text-muted-foreground">This internship isn&apos;t available.</p>
              : elig.applied ? <p className="text-sm text-success">You&apos;ve already applied — see below.</p>
              : !elig.open ? <p className="text-sm text-warning">{elig.deadline_passed ? "The application deadline has passed." : "Applications are closed."}</p>
              : !elig.course_met ? <p className="text-sm text-muted-foreground">To apply you need the certificate for <Link className="font-medium text-primary underline" href={elig.course_slug ? `/courses/${elig.course_slug}` : "/courses"}>{elig.course_title ?? "the required course"}</Link>. Complete it and claim your certificate first.</p>
              : <div className="max-w-xl"><ApplyForm internshipId={target.id} /></div>}
          </div>
        </section>
      ) : null}

      {apps.length === 0 ? (
        <EmptyState icon={Briefcase} title="No applications yet" description="When you apply for an internship, you can follow its progress here." action={<ButtonLink href="/internships" variant="outline" size="sm">Browse internships</ButtonLink>} />
      ) : (
        <ul className="space-y-4">
          {apps.map((a) => (
            <li key={a.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><p className="font-semibold">{a.internship ? <Link href={`/internships/${a.internship.slug}`} className="hover:text-primary">{a.internship.title}</Link> : "Internship"}</p><p className="text-xs text-muted-foreground">{a.internship?.company} · applied {new Date(a.created_at).toLocaleDateString("en-IN")}</p></div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${TONE[a.status] ?? "bg-primary-soft text-primary"}`}>{LABEL[a.status] ?? a.status}</span>
              </div>
              <ol className="mt-4 space-y-2 border-l border-border pl-4">
                {a.events.map((e) => (
                  <li key={e.id} className="text-sm"><span className="font-medium">{LABEL[e.status] ?? e.status}</span> <span className="text-xs text-muted-foreground">· {new Date(e.created_at).toLocaleDateString("en-IN")}</span>{e.note && e.note !== "Application submitted" ? <p className="text-muted-foreground">{e.note}</p> : null}</li>
                ))}
              </ol>
              {["applied", "shortlisted", "interview"].includes(a.status) ? <div className="mt-4"><WithdrawButton id={a.id} /></div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
