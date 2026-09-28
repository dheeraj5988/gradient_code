/* eslint-disable @typescript-eslint/no-explicit-any */
import { History } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";

export const metadata = { title: "Audit log" };

export default async function Audit({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["created_at"], defaultSort: "created_at", filters: ["type", "entity"], pageSize: 50 });
  let q = ctx.supabase.from("admin_audit_log").select("*", { count: "exact" });
  if (p.filters.type) q = q.eq("entity_type", p.filters.type);
  if (p.filters.entity) q = q.or(`entity_id.eq.${p.filters.entity.replace(/[^\w-]/g, "")},details->>course_id.eq.${p.filters.entity.replace(/[^\w-]/g, "")},details->>user_id.eq.${p.filters.entity.replace(/[^\w-]/g, "")}`);
  if (p.q) q = q.ilike("summary", `%${p.q.replace(/[%_]/g, "")}%`);
  const { data, count } = await q.order("created_at", { ascending: false }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((r: any) => r.actor_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Audit log" description="Append-only record of admin changes. Entries cannot be edited or deleted from the app." />
      <Toolbar params={p} placeholder="Search summaries" filters={[{ name: "type", label: "Type", options: ["course", "module", "lesson", "question", "topic", "resource", "enrollment", "review", "instructor", "import"].map((t) => [t, t]) }]} />
      <DataTable base="/admin/audit" params={p} total={count ?? 0}
        columns={[{ key: "created_at", label: "When" }, { key: "who", label: "Admin" }, { key: "action", label: "Action" }, { key: "summary", label: "Summary" }]}
        rows={(data ?? []).map((r: any) => ({ key: String(r.id), cells: [
          <span key="w" className="text-xs whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-IN")}</span>,
          <span key="a" className="text-xs">{people.get(r.actor_id)?.email ?? "—"}</span>,
          <code key="c" className="font-mono text-xs">{r.action}</code>,
          <span key="s" className="text-sm">{r.summary}</span>,
        ] }))}
        empty={<EmptyState icon={History} title="No admin activity yet" />}
      />
    </div>
  );
}
