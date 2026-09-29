import type { Metadata } from "next";
import { BadgeCheck, ShieldAlert, ShieldX } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { verifyCertificate } from "@/lib/data/certificates";

export const metadata: Metadata = { title: "Certificate verification", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyResult({ params }: { params: Promise<{ number: string }> }) {
  const number = decodeURIComponent((await params).number).toUpperCase();
  const v = await verifyCertificate(number);
  const state = !v ? "unavailable" : v.not_found ? "notfound" : v.revoked ? "revoked" : "valid";
  const Icon = state === "valid" ? BadgeCheck : state === "revoked" ? ShieldAlert : ShieldX;
  const tone = state === "valid" ? "text-success bg-success-soft" : state === "revoked" ? "text-warning bg-warning-soft" : "text-danger bg-danger-soft";
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Verify a certificate", href: "/verify" }, { label: "Result" }]} />
      <div className="mt-6 max-w-xl rounded-xl border border-border p-6 sm:p-8">
        <span className={`flex h-12 w-12 items-center justify-center rounded-full ${tone}`}><Icon className="h-6 w-6" aria-hidden /></span>
        <h1 className="mt-4 text-2xl font-bold">
          {state === "valid" ? "Valid certificate" : state === "revoked" ? "Certificate revoked" : state === "notfound" ? "No certificate found" : "Verification unavailable"}
        </h1>
        {state === "valid" || state === "revoked" ? (
          <dl className="mt-5 space-y-3 text-sm">
            <div><dt className="text-xs text-muted-foreground">Awarded to</dt><dd className="text-base font-semibold">{v!.holder_name || "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Course</dt><dd className="font-medium">{v!.course_title}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Issued</dt><dd>{v!.issued_at ? new Date(v!.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Credential ID</dt><dd className="font-mono text-xs">{v!.number}</dd></div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{state === "notfound" ? `We couldn't find a certificate with the ID “${number.slice(0, 40)}”. Check the ID and try again.` : "Please try again in a moment."}</p>
        )}
        {state === "revoked" ? <p className="mt-4 text-sm text-warning">This certificate is no longer valid.</p> : null}
        <div className="mt-6 flex flex-wrap gap-2">
          {state === "valid" ? <ButtonLink size="sm" href={`/certificate/${v!.number}`}>View certificate</ButtonLink> : null}
          <ButtonLink size="sm" variant="outline" href="/verify">Verify another</ButtonLink>
        </div>
      </div>
    </div>
  );
}
