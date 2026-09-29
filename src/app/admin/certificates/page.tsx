/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Award } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { ActionButton, AdminForm, SubmitButton, TextInput } from "@/components/admin/form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { setCertificateRevoked } from "./actions";

export const metadata = { title: "Certificates" };

export default async function Certificates({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["issued_at"], defaultSort: "issued_at" });
  let q = ctx.supabase.from("certificates").select("id,user_id,certificate_number,issued_at,holder_name,revoked_at,revoked_reason,course:courses(title)", { count: "exact" });
  if (p.q) q = q.ilike("certificate_number", ilikeTerm(p.q));
  const { data, count } = await q.order("issued_at", { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((c: any) => c.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Certificates" description="Issued certificates. Learners claim them themselves once the course policy is met; here you can revoke or reinstate. Certificates are never edited." actions={<ButtonLink href="/admin/certificates/policies" variant="outline" size="sm">Course policies</ButtonLink>} />
      <Toolbar params={p} placeholder="Search credential ID…" />
      <DataTable base="/admin/certificates" params={p} total={count ?? 0}
        columns={[{ key: "n", label: "Credential ID" }, { key: "who", label: "Learner" }, { key: "course", label: "Course" }, { key: "issued_at", label: "Issued", sortable: true }, { key: "s", label: "Status" }, { key: "a", label: "" }]}
        rows={(data ?? []).map((c: any) => ({ key: c.id, cells: [
          <Link key="n" href={`/verify/${c.certificate_number}`} className="font-mono text-xs text-primary underline break-all">{c.certificate_number}</Link>,
          <span key="w">{c.holder_name ?? "—"}<span className="block text-xs text-muted-foreground">{people.get(c.user_id)?.email}</span></span>,
          c.course?.title ?? "—",
          new Date(c.issued_at).toLocaleDateString("en-IN"),
          c.revoked_at ? <span key="s" className="text-xs text-warning" title={c.revoked_reason ?? undefined}>Revoked</span> : <span key="s" className="text-xs text-success">Valid</span>,
          c.revoked_at
            ? <ActionButton key="a" action={setCertificateRevoked} variant="outline" size="sm" confirm="Reinstate this certificate?" hidden={{ id: c.id, revoke: "false" }}>Reinstate</ActionButton>
            : <details key="a" className="text-xs"><summary className="cursor-pointer text-primary">Revoke…</summary><div className="mt-2 w-56"><AdminForm action={setCertificateRevoked}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="revoke" value="true" /><TextInput name="reason" label="Reason" required /><SubmitButton size="sm" variant="outline" pendingText="Working…">Revoke</SubmitButton></AdminForm></div></details>,
        ] }))}
        empty={<EmptyState icon={Award} title="No certificates issued" description="They appear here when learners meet a course's certificate policy and claim theirs." />}
      />
    </div>
  );
}
