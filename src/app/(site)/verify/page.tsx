import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Label } from "@/components/ui/input";

export const metadata: Metadata = { title: "Verify a certificate", alternates: { canonical: "/verify" } };

export default function VerifyPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Verify a certificate" }]} />
      <div className="mt-6 max-w-xl rounded-xl border border-border p-6 sm:p-8">
        <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
        <h1 className="mt-4 text-2xl font-bold">Verify a certificate</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter the credential ID printed on the certificate, for example GC-1A2B3C4D5E.</p>
        {/* TODO(antigravity, Phase 6): route to /verify/[credentialId] backed by a SECURITY DEFINER RPC */}
        <form className="mt-6">
          <Label htmlFor="cid">Credential ID</Label>
          <div className="flex gap-2">
            <input id="cid" name="id" required placeholder="GC-XXXXXXXXXX" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 font-mono text-sm uppercase focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <button className="h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">Verify</button>
          </div>
        </form>
      </div>
    </div>
  );
}
