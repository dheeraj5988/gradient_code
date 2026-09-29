/* eslint-disable @typescript-eslint/no-explicit-any */
import { AdminHeader } from "@/components/admin/table";
import { AdminForm, Checkbox, SubmitButton, TextInput } from "@/components/admin/form";
import { requireAdminPage } from "@/lib/admin/guard";
import { saveCertificatePolicy } from "../actions";

export const metadata = { title: "Certificate policies" };
export const dynamic = "force-dynamic";

export default async function Policies() {
  const ctx = (await requireAdminPage())!;
  const [{ data: courses }, { data: pols }] = await Promise.all([
    ctx.supabase.from("courses").select("id,title,status,is_demo").neq("status", "archived").order("title"),
    ctx.supabase.from("certificate_policies").select("*"),
  ]);
  const byCourse = new Map<string, any>((pols ?? []).map((p: any) => [p.course_id, p]));
  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <AdminHeader title="Certificate policies" description="A certificate is offered only where a policy is switched on. Eligibility is checked in the database from lesson completion (required, published lessons) and correctly-answered practice questions." crumbs={[{ label: "Certificates", href: "/admin/certificates" }, { label: "Policies" }]} />
      {(courses ?? []).map((c: any) => {
        const pol = byCourse.get(c.id);
        return (
          <section key={c.id} className="rounded-xl border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold">{c.title} <span className="ml-1 text-xs font-normal text-muted-foreground">{c.status}{c.is_demo ? " · demo" : ""}</span></h2>
            <AdminForm action={saveCertificatePolicy.bind(null, c.id)}>
              <Checkbox name="enabled" label="Offer a certificate for this course" defaultChecked={pol?.enabled ?? false} />
              <div className="grid gap-4 sm:grid-cols-3">
                <TextInput name="min_lessons_pct" label="Lessons completed (%)" type="number" min={0} step="1" defaultValue={pol?.min_lessons_pct ?? 100} />
                <TextInput name="min_practice_pct" label="Practice answered correctly (%)" type="number" min={0} step="1" defaultValue={pol?.min_practice_pct ?? 0} hint="0 = not required" />
                <TextInput name="code" label="Credential code" defaultValue={pol?.code ?? ""} placeholder="FSWD" maxLength={8} hint="Appears in the ID: GC-2026-FSWD-…" />
              </div>
              <SubmitButton>Save policy</SubmitButton>
            </AdminForm>
          </section>
        );
      })}
    </div>
  );
}
