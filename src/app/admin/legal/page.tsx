import { AdminHeader } from "@/components/admin/table";
import { AdminForm, Checkbox, SubmitButton, TextArea, TextInput } from "@/components/admin/form";
import { requireAdminPage } from "@/lib/admin/guard";
import { saveSitePage, saveSiteSettings } from "./actions";

export const metadata = { title: "Legal pages" };
export const dynamic = "force-dynamic";

export default async function LegalAdmin() {
  const ctx = (await requireAdminPage())!;
  const [{ data: s }, { data: pages }] = await Promise.all([
    ctx.supabase.from("site_settings").select("*").eq("id", true).maybeSingle(),
    ctx.supabase.from("site_pages").select("slug,title,body_md,reviewed,updated_at").in("slug", ["terms", "privacy", "refund"]),
  ]);
  const order = ["terms", "privacy", "refund"];
  const sorted = (pages ?? []).sort((a, b) => order.indexOf(a.slug) - order.indexOf(b.slug));
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <AdminHeader title="Legal pages" description="Business details fill the {{placeholders}} in the pages below. The starting texts are generic drafts — have them reviewed (ideally by a lawyer) before ticking “Reviewed”." />
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Business details</h2>
        <AdminForm action={saveSiteSettings}>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput name="company_name" label="Brand name" defaultValue={s?.company_name} placeholder="Gradient Code" />
            <TextInput name="legal_name" label="Registered / legal name" defaultValue={s?.legal_name} hint="Shown as the operator in the terms" />
            <TextInput name="support_email" label="Support email" type="email" defaultValue={s?.support_email} />
            <TextInput name="support_phone" label="Support phone" defaultValue={s?.support_phone} />
            <TextInput name="refund_window_days" label="Refund window (days)" type="number" min={0} step="1" defaultValue={s?.refund_window_days} />
            <TextInput name="governing_law" label="Governing law / courts" defaultValue={s?.governing_law} placeholder="the laws of India; courts at <city>" />
          </div>
          <TextArea name="address" label="Business address" rows={3} defaultValue={s?.address} />
          <SubmitButton>Save business details</SubmitButton>
        </AdminForm>
      </section>
      {sorted.map((p) => (
        <section key={p.slug} className="rounded-xl border border-border bg-card p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">{p.title}</h2><a className="text-xs text-primary underline" href={`/${p.slug}`} target="_blank" rel="noopener noreferrer">View public page</a></div>
          <AdminForm action={saveSitePage.bind(null, p.slug)}>
            <TextInput name="title" label="Title" required defaultValue={p.title} />
            <TextArea name="body_md" label="Text" rows={18} mono defaultValue={p.body_md} hint="Use ## for headings, - for bullets, **bold**, [text](https://…). Placeholders: {{company_name}} {{legal_name}} {{support_email}} {{support_phone}} {{address}} {{refund_window_days}} {{governing_law}}" />
            <Checkbox name="reviewed" label="Reviewed and final" hint="Hides the “being finalised” notice on the public page." defaultChecked={p.reviewed} />
            <SubmitButton>Save page</SubmitButton>
          </AdminForm>
        </section>
      ))}
    </div>
  );
}
