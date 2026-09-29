/* eslint-disable @typescript-eslint/no-explicit-any */
import { Briefcase } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { AdminForm, Checkbox, SelectInput, SubmitButton, TextInput } from "@/components/admin/form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";
import { setApplicationStatus } from "../actions";

export const metadata = { title: "Applications" };
export const dynamic = "force-dynamic";
const STATUS: [string, string][] = [["applied", "Applied"], ["shortlisted", "Shortlisted"], ["interview", "Interview"], ["offered", "Offered"], ["rejected", "Not selected"]];

export default async function Applications({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["created_at", "status"], defaultSort: "created_at", filters: ["status"] });
  let q = ctx.supabase.from("internship_applications").select("id,user_id,status,resume_url,portfolio_url,cover_note,created_at,internship:internships(title)", { count: "exact" });
  if (p.filters.status) q = q.eq("status", p.filters.status);
  const { data, count } = await q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((a: any) => a.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Applications" description="Move applicants through the pipeline. Notes are shown to the applicant unless marked internal." crumbs={[{ label: "Internships", href: "/admin/internships" }, { label: "Applications" }]} />
      <Toolbar params={p} placeholder="" filters={[{ name: "status", label: "Status", options: [...STATUS, ["withdrawn", "Withdrawn"]] }]} />
      <DataTable base="/admin/internships/applications" params={p} total={count ?? 0}
        columns={[{ key: "created_at", label: "Applied", sortable: true }, { key: "who", label: "Applicant" }, { key: "job", label: "Internship" }, { key: "status", label: "Status", sortable: true }, { key: "links", label: "Materials" }, { key: "act", label: "" }]}
        rows={(data ?? []).map((a: any) => {
          const job = Array.isArray(a.internship) ? a.internship[0] : a.internship;
          return { key: a.id, cells: [
            <span key="d" className="text-xs whitespace-nowrap">{new Date(a.created_at).toLocaleDateString("en-IN")}</span>,
            <span key="w">{people.get(a.user_id)?.full_name || "—"}<span className="block text-xs text-muted-foreground">{people.get(a.user_id)?.email}</span></span>,
            job?.title ?? "—",
            <span key="s" className="capitalize">{a.status}</span>,
            <span key="l" className="flex flex-col gap-0.5 text-xs">{a.resume_url ? <a className="text-primary underline" href={a.resume_url} target="_blank" rel="noopener noreferrer">Resume</a> : null}{a.portfolio_url ? <a className="text-primary underline" href={a.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a> : null}</span>,
            a.status === "withdrawn" ? <span key="x" className="text-xs text-muted-foreground">Withdrawn</span> : (
              <details key="x" className="text-xs"><summary className="cursor-pointer text-primary">Update…</summary>
                <div className="mt-2 w-64">
                  {a.cover_note ? <p className="mb-2 max-h-24 overflow-auto rounded bg-surface-2 p-2 whitespace-pre-line text-muted-foreground">{a.cover_note}</p> : null}
                  <AdminForm action={setApplicationStatus}><input type="hidden" name="id" value={a.id} /><SelectInput name="status" label="Status" defaultValue={a.status} options={STATUS} /><TextInput name="note" label="Note" /><Checkbox name="internal" label="Internal (hide from applicant)" /><SubmitButton size="sm" pendingText="Saving…">Save</SubmitButton></AdminForm>
                </div>
              </details>
            ),
          ] };
        })}
        empty={<EmptyState icon={Briefcase} title="No applications yet" />}
      />
    </div>
  );
}
