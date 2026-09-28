/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Users } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { ilikeTerm, parseList } from "@/lib/admin/util";

export const metadata = { title: "Students" };

export default async function Students({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["full_name", "email", "created_at"], defaultSort: "created_at", filters: ["status"] });
  let q = ctx.supabase.from("profiles").select("id,full_name,email,is_active,created_at", { count: "exact" });
  if (p.q) q = q.or(`full_name.ilike.${ilikeTerm(p.q)},email.ilike.${ilikeTerm(p.q)}`);
  if (p.filters.status) q = q.eq("is_active", p.filters.status === "active");
  const { data, count } = await q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const ids = (data ?? []).map((u) => u.id);
  const [{ data: enr }, { data: roles }] = ids.length
    ? await Promise.all([ctx.supabase.from("enrollments").select("user_id").in("user_id", ids), ctx.supabase.from("user_roles").select("user_id,role").in("user_id", ids)])
    : [{ data: [] }, { data: [] }];
  const courseCount = new Map<string, number>();
  (enr ?? []).forEach((e: any) => courseCount.set(e.user_id, (courseCount.get(e.user_id) ?? 0) + 1));
  const roleOf = new Map<string, string[]>();
  (roles ?? []).forEach((r: any) => roleOf.set(r.user_id, [...(roleOf.get(r.user_id) ?? []), r.role]));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Students" description="All registered users. Passwords and auth secrets are never shown." />
      <Toolbar params={p} placeholder="Search name or email" filters={[{ name: "status", label: "Status", options: [["active", "Active"], ["inactive", "Inactive"]] }]} />
      <DataTable base="/admin/students" params={p} total={count ?? 0}
        columns={[{ key: "full_name", label: "Name", sortable: true }, { key: "email", label: "Email", sortable: true }, { key: "created_at", label: "Joined", sortable: true }, { key: "courses", label: "Courses", className: "text-right" }, { key: "role", label: "Role" }, { key: "status", label: "Status" }]}
        rows={(data ?? []).map((u) => ({ key: u.id, cells: [
          <Link key="n" href={`/admin/students/${u.id}`} className="font-medium hover:text-primary">{u.full_name || "—"}</Link>,
          <span key="e" className="text-muted-foreground">{u.email}</span>,
          <span key="j" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>,
          <span key="c" className="tabular-nums">{courseCount.get(u.id) ?? 0}</span>,
          <span key="r" className="text-xs capitalize">{(roleOf.get(u.id) ?? ["student"]).join(", ")}</span>,
          <StatusPill key="s" status={u.is_active ? "active" : "expired"} />,
        ] }))}
        empty={<EmptyState icon={Users} title="No students match" />}
      />
    </div>
  );
}
