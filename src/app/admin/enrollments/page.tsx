/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { GrantEnrollmentForm } from "@/components/admin/user-forms";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions, profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";
import { revokeEnrollment } from "../user-actions";

export const metadata = { title: "Enrollments" };

export default async function Enrollments({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["enrolled_at", "source"], defaultSort: "enrolled_at", filters: ["course", "source", "status"] });
  let q = ctx.supabase.from("enrollments").select("id,user_id,course_id,source,enrolled_at,expires_at,notes,granted_by,course:courses(title)", { count: "exact" });
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  if (p.filters.source) q = q.eq("source", p.filters.source);
  if (p.filters.status === "active") q = q.or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);
  if (p.filters.status === "expired") q = q.lt("expires_at", new Date().toISOString());
  if (p.q) {
    const { data: matches } = await ctx.supabase.from("profiles").select("id").or(`email.ilike.%${p.q.replace(/[%_,()]/g, "")}%,full_name.ilike.%${p.q.replace(/[%_,()]/g, "")}%`).limit(200);
    q = q.in("user_id", (matches ?? []).map((m) => m.id).concat("00000000-0000-0000-0000-000000000000"));
  }
  const [{ data, count }, courses] = await Promise.all([q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1), courseOptions(ctx)]);
  const people = await profilesById(ctx, (data ?? []).flatMap((e: any) => [e.user_id, e.granted_by]));
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminHeader title="Enrollments" description="Who has access to which course, and why. Manual grants are recorded in the audit log." />
      <details className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">Grant course access manually</summary>
        <div className="mt-4"><GrantEnrollmentForm courses={courses.filter((c) => c.status !== "archived")} /></div>
      </details>
      <div>
        <Toolbar params={p} placeholder="Search student name or email" filters={[
          { name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) },
          { name: "source", label: "Source", options: [["free", "Free"], ["payment", "Payment"], ["admin", "Admin"], ["manual_grant", "Manual (legacy)"], ["scholarship", "Scholarship"], ["promotion", "Promotion"]] },
          { name: "status", label: "Status", options: [["active", "Active"], ["expired", "Expired"]] },
        ]} />
        <DataTable base="/admin/enrollments" params={p} total={count ?? 0}
          columns={[{ key: "student", label: "Student" }, { key: "course", label: "Course" }, { key: "source", label: "Source", sortable: true }, { key: "status", label: "Status" }, { key: "enrolled_at", label: "Enrolled", sortable: true }, { key: "by", label: "Granted by" }, { key: "a", label: "", className: "text-right" }]}
          rows={(data ?? []).map((e: any) => {
            const expired = e.expires_at && new Date(e.expires_at) < new Date();
            const u = people.get(e.user_id);
            return { key: e.id, cells: [
              <Link key="s" href={`/admin/students/${e.user_id}`} className="block max-w-[14rem] truncate font-medium hover:text-primary">{u?.full_name || u?.email || e.user_id.slice(0, 8)}</Link>,
              <span key="c" className="block max-w-[16rem] truncate">{e.course?.title}</span>,
              <span key="so" className="text-xs capitalize">{e.source.replace("_", " ")}</span>,
              <StatusPill key="st" status={expired ? "expired" : "active"} />,
              <span key="d" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(e.enrolled_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>,
              <span key="b" className="text-xs text-muted-foreground" title={e.notes ?? ""}>{e.granted_by ? people.get(e.granted_by)?.email ?? "Admin" : "—"}</span>,
              e.source !== "payment" ? <ActionButton key="a" action={revokeEnrollment} hidden={{ id: e.id }} confirm="Revoke this learner's access? Their progress is kept." variant="ghost" size="sm">Revoke</ActionButton> : <span key="a" />,
            ] };
          })}
          empty={<EmptyState icon={GraduationCap} title="No enrollments match" />}
        />
      </div>
    </div>
  );
}
