import { emailDeliveryStatus } from "@/lib/email/config";
import { CheckCircle2, CircleSlash } from "lucide-react";
import { AdminHeader } from "@/components/admin/table";
import { requireAdminPage } from "@/lib/admin/guard";
import { driveConfigStatus } from "@/lib/google-drive/client";

export const metadata = { title: "Settings & integrations" };

/** Shows which integrations are configured — presence only, never values. */
export default async function Settings() {
  await requireAdminPage();
  const drive = driveConfigStatus();
  const env = (k: string) => Boolean(process.env[k]);
  const rows: { name: string; ok: boolean; detail: string }[] = [
    { name: "Supabase (URL + publishable key)", ok: env("NEXT_PUBLIC_SUPABASE_URL") && (env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") || env("NEXT_PUBLIC_SUPABASE_ANON_KEY")), detail: "Required for the whole app." },
    { name: "Site URL", ok: env("NEXT_PUBLIC_SITE_URL"), detail: "Used for canonical URLs and auth redirects." },
    { name: "Google Drive streaming", ok: drive.mode !== "none", detail: drive.mode === "service_account" ? "Service account configured — private Drive files are streamed through /api/video." : drive.mode === "api_key" ? "API key only — works for files shared as 'anyone with the link'. Use a service account for private files." : "Not configured. Drive lessons fall back to the Drive preview player and the importer can't scan folders." },
    { name: "Email delivery (verification & password-reset codes)", ...emailDeliveryStatus() },
    { name: "Supabase service role key", ok: env("SUPABASE_SERVICE_ROLE_KEY"), detail: "Required for payments: the server creates orders and grants access after verifying the gateway. Manage the gateway itself in Admin → Payments." },
  ];
  return (
    <div className="mx-auto max-w-3xl">
      <AdminHeader title="Settings & integrations" description="Configuration status of this deployment. Secret values are never displayed." />
      <ul className="divide-y divide-border rounded-xl border border-border bg-card">
        {rows.map((r) => (
          <li key={r.name} className="flex gap-3 px-5 py-4">
            {r.ok ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-label="Configured" /> : <CircleSlash className="mt-0.5 h-5 w-5 shrink-0 text-subtle-foreground" aria-label="Not configured" />}
            <div><p className="text-sm font-semibold">{r.name}</p><p className="text-sm text-muted-foreground">{r.detail}</p></div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">Set environment variables in Vercel → Project → Settings → Environment Variables, then redeploy. See docs/GOOGLE_DRIVE_SETUP.md.</p>
    </div>
  );
}
