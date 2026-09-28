/* eslint-disable @typescript-eslint/no-explicit-any */
import { Award } from "lucide-react";
import { AdminHeader, DataTable } from "@/components/admin/table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";

export const metadata = { title: "Certificates" };

export default async function Certificates({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["issued_at"], defaultSort: "issued_at" });
  let q = ctx.supabase.from("certificates").select("id,user_id,certificate_number,issued_at,course:courses(title)", { count: "exact" });
  if (p.q) q = q.ilike("certificate_number", `%${p.q.replace(/[%_]/g, "")}%`);
  const { data, count } = await q.order("issued_at", { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((c: any) => c.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Certificates" description="Read-only. Eligibility rules and issuance are built in the certificates phase (see docs/CERTIFICATE_ARCHITECTURE.md)." />
      <DataTable base="/admin/certificates" params={p} total={count ?? 0}
        columns={[{ key: "n", label: "Credential ID" }, { key: "who", label: "Learner" }, { key: "course", label: "Course" }, { key: "issued_at", label: "Issued", sortable: true }]}
        rows={(data ?? []).map((c: any) => ({ key: c.id, cells: [<span key="n" className="font-mono text-xs">{c.certificate_number}</span>, people.get(c.user_id)?.email ?? "—", c.course?.title ?? "—", new Date(c.issued_at).toLocaleDateString("en-IN")] }))}
        empty={<EmptyState icon={Award} title="No certificates issued" />}
      />
    </div>
  );
}
