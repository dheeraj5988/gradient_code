import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand";
import { PrintButton } from "@/components/print-button";
import { verifyCertificate } from "@/lib/data/certificates";

export const metadata: Metadata = { title: "Certificate", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CertificatePrint({ params }: { params: Promise<{ number: string }> }) {
  const number = decodeURIComponent((await params).number).toUpperCase();
  const v = await verifyCertificate(number);
  if (!v || v.not_found) notFound();
  const date = v.issued_at ? new Date(v.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";
  return (
    <div className="min-h-screen bg-surface px-4 py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 0 } @media print { html, body { background: #fff !important } }`}</style>
      <div className="mx-auto mb-5 flex max-w-4xl flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/dashboard/certificates" className="text-sm text-primary underline">← Back</Link>
        <PrintButton />
      </div>
      <div className="mx-auto aspect-[1.414/1] w-full max-w-4xl rounded-xl border-2 border-border-strong bg-background p-3 shadow-card print:h-screen print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <div className="flex h-full flex-col items-center justify-between rounded-lg border border-border px-6 py-8 text-center sm:px-14 sm:py-12">
          <Logo />
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.2em] text-subtle-foreground uppercase">Certificate of completion</p>
            <p className="mt-6 text-sm text-muted-foreground">This is to certify that</p>
            <h1 className="mt-2 text-3xl font-bold break-words sm:text-5xl">{v.holder_name || "—"}</h1>
            <p className="mt-6 text-sm text-muted-foreground">has successfully completed the course</p>
            <p className="mt-2 text-xl font-semibold break-words sm:text-2xl">{v.course_title}</p>
            {v.revoked ? <p className="mt-4 text-sm font-semibold text-danger">REVOKED — this certificate is no longer valid</p> : null}
          </div>
          <div className="flex w-full flex-wrap items-end justify-between gap-3 text-left text-xs text-muted-foreground">
            <div><p>Issued {date}</p><p className="mt-0.5 font-mono">ID {v.number}</p></div>
            <p className="text-right">Verify at<br /><span className="font-mono text-foreground">/verify/{v.number}</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}
