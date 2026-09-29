import { notFound } from "next/navigation";
import Link from "next/link";
import { Award, Check, Circle } from "lucide-react";
import { Panel, PortalPage } from "@/components/learn/portal";
import { ClaimCertificate } from "@/components/learn/claim-certificate";
import { ButtonLink } from "@/components/ui/button";
import { getLearningContext } from "@/lib/data/learning";
import { getEligibility, type Progress } from "@/lib/data/certificates";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export const metadata = { title: "Certificate" };
export const dynamic = "force-dynamic";

function Row({ label, p }: { label: string; p: Progress }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 text-sm">
      {p.met ? <Check className="h-4 w-4 text-success" aria-label="Met" /> : <Circle className="h-4 w-4 text-subtle-foreground" aria-label="Not met" />}
      <span className="flex-1">{label}<span className="block text-xs text-muted-foreground">Required: {p.required_pct}%</span></span>
      <span className="text-xs text-muted-foreground tabular-nums">{p.done} / {p.total} · {p.pct}%</span>
    </li>
  );
}

export default async function CertificatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const el = ctx.access === "enrolled" && !IS_DEMO ? await getEligibility(ctx.course.id) : null;
  let name = "";
  if (el && ctx.userId) { const { data } = await (await createClient()).from("profiles").select("full_name").eq("id", ctx.userId).maybeSingle(); name = data?.full_name ?? ""; }
  return (
    <PortalPage title="Certificate" description="Earned by meeting this course's requirements — not only by watching videos. Eligibility is checked on the server.">
      <Panel>
        <div className="mb-4 flex items-center gap-3"><Award className="h-6 w-6 text-primary" aria-hidden /><p className="text-sm text-muted-foreground">Your progress towards this course&apos;s certificate.</p></div>
        {ctx.access !== "enrolled" ? (
          <p className="text-sm text-muted-foreground">Enroll in this course to work towards its certificate.</p>
        ) : !el ? (
          <p className="text-sm text-muted-foreground">Certificate status isn&apos;t available right now.</p>
        ) : !el.enabled ? (
          <p className="text-sm text-muted-foreground">A certificate isn&apos;t offered for this course yet.</p>
        ) : (
          <div className="space-y-5">
            <ul className="divide-y divide-border rounded-lg border border-border">
              <Row label="Required lessons completed" p={el.lessons} />
              <Row label="Practice questions answered correctly" p={el.practice} />
            </ul>
            {el.certificate ? (
              <div className="rounded-lg border border-success/25 bg-success-soft p-4 text-sm">
                <p className="font-semibold text-success">{el.certificate.revoked ? "Your certificate has been revoked." : "Certificate issued"}</p>
                <p className="mt-1 font-mono text-xs">{el.certificate.number}</p>
                <div className="mt-3 flex flex-wrap gap-2"><ButtonLink size="sm" href={`/certificate/${el.certificate.number}`}>View & download</ButtonLink><ButtonLink size="sm" variant="outline" href={`/verify/${el.certificate.number}`}>Verification page</ButtonLink></div>
              </div>
            ) : el.eligible ? (
              <div><p className="mb-3 text-sm font-medium text-success">You&apos;ve met every requirement.</p><ClaimCertificate courseId={ctx.course.id} slug={slug} defaultName={name} /></div>
            ) : (
              <p className="text-sm text-muted-foreground">Keep going — the button to claim your certificate appears here when every requirement is met. <Link className="text-primary underline" href={`/learn/${slug}`}>Continue learning</Link></p>
            )}
          </div>
        )}
      </Panel>
    </PortalPage>
  );
}
