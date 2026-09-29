/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminHeader } from "@/components/admin/table";
import { ActionButton, AdminForm, SubmitButton, TextInput } from "@/components/admin/form";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/utils";
import { processPayout, saveReferralCode, toggleReferralCode } from "./actions";

export const metadata = { title: "Referrals" };
export const dynamic = "force-dynamic";

export default async function ReferralsAdmin() {
  const ctx = (await requireAdminPage())!;
  await ctx.supabase.rpc("refresh_commissions");
  const [{ data: payouts }, { data: codes }, { data: totals }] = await Promise.all([
    ctx.supabase.from("referral_payouts").select("*").order("created_at", { ascending: false }).limit(50),
    ctx.supabase.from("referral_codes").select("id,user_id,code,commission_percent,is_active,created_at").order("created_at", { ascending: false }).limit(100),
    ctx.supabase.from("admin_referral_totals").select("*"),
  ]);
  const ids = [...new Set([...(payouts ?? []).map((p: any) => p.referrer_user_id), ...(codes ?? []).map((c: any) => c.user_id)])];
  const people = await profilesById(ctx, ids);
  const tot = new Map<string, any>((totals ?? []).map((t: any) => [t.referrer_user_id, t]));
  const open = (payouts ?? []).filter((p: any) => p.status === "requested");
  const done = (payouts ?? []).filter((p: any) => p.status !== "requested");
  const who = (id: string) => people.get(id)?.email ?? id.slice(0, 8);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminHeader title="Referrals" description="Commission is created only from verified payments and becomes payable after the hold period. Pay out manually (UPI/bank), then record the reference here." />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Payout requests {open.length ? `(${open.length} open)` : ""}</h2>
        {open.length === 0 ? <p className="text-sm text-muted-foreground">No open requests.</p> : (
          <ul className="space-y-4">
            {open.map((p: any) => (
              <li key={p.id} className="rounded-lg border border-border p-3">
                <p className="text-sm"><span className="font-semibold tabular-nums">{formatPrice(Number(p.amount))}</span> to <span className="font-medium">{who(p.referrer_user_id)}</span></p>
                <p className="mt-0.5 text-xs text-muted-foreground">{p.payment_method.toUpperCase()}: <span className="font-mono break-all">{p.payout_identifier}</span> · requested {new Date(p.created_at).toLocaleDateString("en-IN")}</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <AdminForm action={processPayout}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="action" value="complete" /><TextInput name="reference" label="Transaction reference" required /><SubmitButton size="sm" pendingText="Working…">Mark paid</SubmitButton></AdminForm>
                  <AdminForm action={processPayout}><input type="hidden" name="id" value={p.id} /><input type="hidden" name="action" value="reject" /><TextInput name="note" label="Reason to reject" /><SubmitButton size="sm" variant="outline" pendingText="Working…">Reject</SubmitButton></AdminForm>
                </div>
              </li>
            ))}
          </ul>
        )}
        {done.length ? (
          <details className="mt-4 text-sm"><summary className="cursor-pointer text-primary">Processed payouts ({done.length})</summary>
            <ul className="mt-2 divide-y divide-border">{done.map((p: any) => <li key={p.id} className="flex flex-wrap justify-between gap-2 py-1.5 text-xs"><span>{who(p.referrer_user_id)}</span><span className="tabular-nums">{formatPrice(Number(p.amount))}</span><span className="capitalize">{p.status}{p.transaction_reference ? ` · ${p.transaction_reference}` : ""}</span></li>)}</ul>
          </details>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">Set a custom code</h2>
        <AdminForm action={saveReferralCode} resetOnSuccess className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
          <TextInput name="email" label="User email" type="email" required />
          <TextInput name="code" label="Code" required placeholder="RAHUL10" maxLength={20} />
          <TextInput name="commission_percent" label="Commission %" type="number" min={0} step="0.5" hint="Empty = default" />
          <SubmitButton>Save</SubmitButton>
        </AdminForm>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Referrers</h2>
        {(codes ?? []).length === 0 ? <p className="text-sm text-muted-foreground">No referral codes yet. They&apos;re created when a student opens “Refer &amp; earn”.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground"><th className="py-1.5 font-medium">User</th><th className="font-medium">Code</th><th className="font-medium">Earned</th><th className="font-medium">Paid out</th><th className="font-medium">Available</th><th /></tr></thead>
            <tbody className="divide-y divide-border">
              {(codes as any[]).map((c) => { const t = tot.get(c.user_id); return (
                <tr key={c.id}><td className="py-2">{who(c.user_id)}</td><td className="font-mono text-xs">{c.code}{c.commission_percent != null ? ` · ${c.commission_percent}%` : ""}</td><td className="tabular-nums">{formatPrice(Number(t?.earned ?? 0))}</td><td className="tabular-nums">{formatPrice(Number(t?.paid_out ?? 0))}</td><td className="tabular-nums">{formatPrice(Number(t?.available ?? 0))}</td>
                  <td className="text-right"><ActionButton action={toggleReferralCode} variant="ghost" size="sm" hidden={{ id: c.id, active: String(!c.is_active) }}>{c.is_active ? "Disable" : "Enable"}</ActionButton></td></tr>
              ); })}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
