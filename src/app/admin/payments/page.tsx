import { CheckCircle2, CircleAlert, ShieldCheck } from "lucide-react";
import { AdminHeader } from "@/components/admin/table";
import { ActionButton, AdminForm, Checkbox, SubmitButton, TextInput } from "@/components/admin/form";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadPaymentConfig } from "@/lib/payments/config";
import { requestOrigin } from "@/lib/payments/origin";
import { serviceKeyName } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { clearGatewayCredentials, savePaymentSettings, testGateway } from "./actions";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

function Check({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CheckCircle2 : CircleAlert;
  return <li className="flex items-start gap-2 text-sm"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-success" : "text-warning"}`} aria-hidden /><span>{children}</span></li>;
}

export default async function PaymentsAdmin() {
  await requireAdminPage();
  const cfg = await loadPaymentConfig();
  const origin = await requestOrigin();
  const keyName = serviceKeyName();
  const siteEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? null;
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <AdminHeader title="Payments" description="Paypur UPI gateway. Students pay on the checkout page; access is granted only after the gateway's signed confirmation is verified on the server." />

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Status</h2>
        <ul className="space-y-2">
          <Check ok={cfg.serviceReady}>Server key {keyName ? <><code className="text-xs">{keyName}</code> is set</> : <>missing — add <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in Vercel → Environment Variables, then redeploy</>}</Check>
          <Check ok={!siteEnv || siteEnv === origin}>Site URL {siteEnv === origin || !siteEnv ? "matches this domain" : <>env <code className="text-xs">NEXT_PUBLIC_SITE_URL</code> is <code className="text-xs">{siteEnv}</code> but you are on <code className="text-xs">{origin}</code> — set it to your public domain (payments already use the domain the buyer is on)</>}</Check>
          <Check ok={cfg.hasCredentials}>Gateway credentials {cfg.hasCredentials ? `saved${cfg.keyHint ? ` (key ends …${cfg.keyHint})` : ""}${cfg.credentialSource === "env" ? " via environment variables" : ""}` : "not added yet"}</Check>
          <Check ok={cfg.enabled}>Payments are {cfg.enabled ? "ON" : "OFF"}</Check>
          <Check ok={!cfg.testMode}>{cfg.testMode ? `Test mode ON — every paid course is charged ${formatPrice(cfg.testAmount)}` : "Live prices are being charged"}</Check>
        </ul>
        {cfg.problem ? <p className="mt-3 rounded-lg bg-warning-soft px-3 py-2 text-xs text-warning">{cfg.problem}</p> : null}
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-1 text-sm font-semibold">Paypur setup</h2>
        <p className="mb-3 text-sm text-muted-foreground">In the Paypur dashboard, set the success and failure return URL of your merchant account to:</p>
        <code className="block overflow-x-auto rounded-lg bg-surface-2 px-3 py-2 text-xs">{origin}/api/paypur/callback</code>
        <p className="mt-2 text-xs text-muted-foreground">This app also sends this URL with every payment request, so no dashboard change is normally needed.</p>
      </section>

      <AdminForm action={savePaymentSettings} className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Gateway credentials</h2>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Stored encrypted (AES-256-GCM) and never shown again. Leave a field empty to keep the saved value.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="gateway_key" label="Gateway Key" hint="Sent as X-PAYPUR-KEY" placeholder={cfg.keyHint ? `saved · ends …${cfg.keyHint}` : "paste key"} type="password" />
            <TextInput name="gateway_salt" label="Gateway Salt" hint="Used to sign & verify requests" placeholder={cfg.hasCredentials ? "saved" : "paste salt"} type="password" />
          </div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Checkout</h2>
          <Checkbox name="enabled" label="Accept payments" hint="When off, paid courses show “Payments unavailable”." defaultChecked={cfg.enabled} />
          <Checkbox name="test_mode" label="Test mode — charge a fixed test amount" hint="Every paid course costs the test amount; the real course prices are not changed. Turn this off to go live at the real prices." defaultChecked={cfg.testMode} />
          <div className="max-w-[12rem]"><TextInput name="test_amount" label="Test amount (₹)" type="number" min={1} step="1" defaultValue={cfg.testAmount} /></div>
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold">Referral programme</h2>
          <Checkbox name="referral_enabled" label="Referral programme enabled" hint="Commission is created only after a verified payment." defaultChecked={cfg.referral.enabled} />
          <div className="grid gap-4 sm:grid-cols-3">
            <TextInput name="referral_commission_percent" label="Commission (%)" type="number" min={0} step="0.5" defaultValue={cfg.referral.commissionPercent} />
            <TextInput name="referral_clearance_days" label="Hold before payable (days)" type="number" min={0} step="1" hint="Covers the refund window" defaultValue={cfg.referral.clearanceDays} />
            <TextInput name="referral_min_payout" label="Minimum payout (₹)" type="number" min={0} step="1" defaultValue={cfg.referral.minPayout} />
          </div>
        </section>
        <SubmitButton>Save settings</SubmitButton>
      </AdminForm>

      <section className="flex flex-wrap items-start gap-3 rounded-xl border border-border bg-card p-5">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Tools</h2>
          <p className="text-xs text-muted-foreground">The connection check confirms the gateway is reachable and the key isn&apos;t rejected. Only a real ₹1 purchase proves the whole flow end to end.</p>
        </div>
        <ActionButton action={testGateway} variant="outline">Check connection</ActionButton>
        <ActionButton action={clearGatewayCredentials} variant="outline" confirm="Remove the saved key and salt and switch payments off?">Remove credentials</ActionButton>
      </section>
    </div>
  );
}
