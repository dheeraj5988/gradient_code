/* eslint-disable @typescript-eslint/no-explicit-any */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Share2 } from "lucide-react";
import { CopyField } from "@/components/copy-field";
import { AdminForm, SelectInput, SubmitButton, TextInput } from "@/components/admin/form";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { formatPrice } from "@/lib/utils";
import { requestPayout } from "./actions";

export const metadata = { title: "Refer & earn" };
export const dynamic = "force-dynamic";

const LABEL: Record<string, string> = { pending_clearance: "Pending", approved: "Available", paid_out: "Paid", cancelled: "Cancelled" };

export default async function Referrals() {
  if (IS_DEMO) return <EmptyState icon={Share2} title="Referrals need a configured database" description="Connect Supabase to enable the referral programme." />;
  const user = await getUser();
  if (!user) redirect("/login?next=/dashboard/referrals");
  const supabase = await createClient();
  await supabase.rpc("refresh_commissions");
  const { data: code } = await supabase.rpc("get_or_create_referral_code");
  const [{ data: ledger }, { data: payouts }] = await Promise.all([
    supabase.from("referral_commission_ledger").select("id,commission_amount,status,clearance_due_at,created_at,payout_id").order("created_at", { ascending: false }).limit(50),
    supabase.from("referral_payouts").select("id,amount,status,payment_method,transaction_reference,admin_note,created_at").order("created_at", { ascending: false }).limit(20),
  ]);
  const rows = (ledger ?? []) as any[];
  const sum = (f: (r: any) => boolean) => rows.filter(f).reduce((s, r) => s + Number(r.commission_amount), 0);
  const available = sum((r) => r.status === "approved" && !r.payout_id);
  const pending = sum((r) => r.status === "pending_clearance");
  const paid = sum((r) => r.status === "paid_out");
  const h = await headers();
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const link = `${origin}/r/${code}`;
  const stat = (label: string, v: number, hint?: string) => (
    <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-bold tabular-nums">{formatPrice(v)}</p>{hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}</div>
  );
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Refer &amp; earn</h1><p className="mt-1 text-sm text-muted-foreground">Share your link. When someone buys a course through it, you earn a commission after the refund window passes.</p></div>
      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Your referral link</h2>
        <CopyField value={link} label="Referral link" />
        <p className="text-xs text-muted-foreground">Your code: <span className="font-semibold text-foreground">{String(code)}</span>. You can&apos;t earn from your own purchases.</p>
      </section>
      <div className="grid gap-3 sm:grid-cols-3">{stat("Available to withdraw", available)}{stat("Pending clearance", pending, "Released after the refund window")}{stat("Paid out", paid)}</div>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Request a payout</h2>
        <AdminForm action={requestPayout} resetOnSuccess className="grid gap-4 sm:grid-cols-[10rem_1fr_auto] sm:items-end">
          <SelectInput name="method" label="Method" defaultValue="upi" options={[["upi", "UPI"], ["bank", "Bank account"]]} />
          <TextInput name="identifier" label="UPI ID / bank details" required placeholder="name@bank" />
          <SubmitButton pendingText="Requesting…">Request {available > 0 ? formatPrice(available) : "payout"}</SubmitButton>
        </AdminForm>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Commissions</h2>
        {rows.length === 0 ? <p className="text-sm text-muted-foreground">No referred purchases yet.</p> : (
          <ul className="divide-y divide-border text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2"><span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span><span className="tabular-nums font-medium">{formatPrice(Number(r.commission_amount))}</span><span className="w-24 text-right text-xs">{LABEL[r.status] ?? r.status}</span></li>
            ))}
          </ul>
        )}
      </section>
      {(payouts ?? []).length ? (
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Payout requests</h2>
          <ul className="divide-y divide-border text-sm">
            {(payouts as any[]).map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2"><span className="text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-IN")}</span><span className="tabular-nums font-medium">{formatPrice(Number(p.amount))}</span><span className="text-xs capitalize">{p.status}{p.transaction_reference ? ` · ref ${p.transaction_reference}` : ""}{p.status === "rejected" && p.admin_note ? ` · ${p.admin_note}` : ""}</span></li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
