import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Label } from "@/components/ui/input";

export const metadata: Metadata = { title: "Verify a certificate", alternates: { canonical: "/verify" } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const clean = (id ?? "").trim().toUpperCase();
  if (/^[A-Z0-9-]{6,40}$/.test(clean)) redirect(`/verify/${clean}`);
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Verify a certificate" }]} />
      <div className="mt-6 max-w-xl rounded-xl border border-border p-6 sm:p-8">
        <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Verify a certificate</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the credential ID printed on the certificate, for example GC-2026-ABC-K7M2XQ4P.</p>
        <form className="mt-6" action="/verify" method="get">
          <Label htmlFor="cid">Credential ID</Label>
          <div className="flex gap-2">
            <input id="cid" name="id" required placeholder="GC-2026-XXX-XXXXXXXX" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Verify</button>
          </div>
        </form>
      </div>
    </div>
  );
}
