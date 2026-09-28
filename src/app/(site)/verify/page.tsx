import { SectionHeading } from "@/components/brand";

export const metadata = { title: "Verify a certificate" };

export default function VerifyPage() {
  return (
    <div className="container-page max-w-xl py-16">
      <SectionHeading eyebrow="Certificates" title="Verify a certificate" subtitle="Enter the certificate ID (e.g. GC-1A2B3C4D5E)." />
      <form className="mt-8 flex gap-2">
        <input name="id" placeholder="GC-XXXXXXXXXX" className="h-11 flex-1 rounded-xl border border-border bg-surface px-4 text-sm" />
        <button className="gradient-fill rounded-xl px-5 text-sm font-semibold">Verify</button>
      </form>
      {/* TODO(antigravity): lookup via a SECURITY DEFINER RPC verify_certificate(number) returning name, course, date. */}
    </div>
  );
}
