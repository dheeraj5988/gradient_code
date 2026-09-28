/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { FileText } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { deleteResource } from "../content-actions";

export const metadata = { title: "Resources" };

export default async function Resources({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["title", "resource_type", "updated_at", "order_index"], defaultSort: "updated_at", filters: ["course", "type", "status"] });
  let q = ctx.supabase.from("course_resources").select("id,title,resource_type,url,file_path,drive_file_id,is_published,is_downloadable,updated_at,course:courses(title),module:course_modules(title)", { count: "exact" });
  if (p.q) q = q.or(`title.ilike.${ilikeTerm(p.q)},description.ilike.${ilikeTerm(p.q)}`);
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  if (p.filters.type) q = q.eq("resource_type", p.filters.type);
  if (p.filters.status) q = q.eq("is_published", p.filters.status === "published");
  const [{ data, count }, courses] = await Promise.all([q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1), courseOptions(ctx)]);
  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader title="Resources" description="PDFs, notes, cheat sheets, repositories and other course material." actions={<ButtonLink href="/admin/resources/new" size="sm">New resource</ButtonLink>} />
      <Toolbar params={p} placeholder="Search resources" filters={[
        { name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) },
        { name: "type", label: "Type", options: [["pdf", "PDF"], ["notes", "Notes"], ["cheat_sheet", "Cheat sheet"], ["external_link", "Link"], ["code_repository", "Code"], ["dataset", "Dataset"], ["template", "Template"], ["presentation", "Slides"], ["recording", "Recording"]] },
        { name: "status", label: "Status", options: [["published", "Published"], ["draft", "Draft"]] },
      ]} />
      <DataTable base="/admin/resources" params={p} total={count ?? 0}
        columns={[{ key: "title", label: "Resource", sortable: true }, { key: "course", label: "Course / module" }, { key: "resource_type", label: "Type", sortable: true }, { key: "source", label: "Source" }, { key: "status", label: "Status" }, { key: "updated_at", label: "Updated", sortable: true }, { key: "a", label: "", className: "text-right" }]}
        rows={(data ?? []).map((r: any) => ({ key: r.id, cells: [
          <Link key="t" href={`/admin/resources/${r.id}`} className="font-medium hover:text-primary">{r.title}</Link>,
          <span key="c" className="block max-w-[14rem] truncate text-xs text-muted-foreground">{r.course?.title}{r.module ? ` · ${r.module.title}` : ""}</span>,
          <span key="ty" className="text-xs capitalize">{r.resource_type.replace("_", " ")}</span>,
          <span key="s" className="text-xs text-muted-foreground">{r.drive_file_id ? "Drive (private)" : r.file_path ? "Storage" : "Link"}</span>,
          <StatusPill key="st" status={r.is_published ? "published" : "draft"} />,
          <span key="u" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(r.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>,
          <span key="a" className="flex justify-end gap-2"><Link href={`/admin/resources/${r.id}`} className="text-xs font-medium text-primary hover:underline">Edit</Link><ActionButton action={deleteResource} hidden={{ id: r.id }} confirm={`Delete “${r.title}”?`} variant="ghost" size="sm">Delete</ActionButton></span>,
        ] }))}
        empty={<EmptyState icon={FileText} title="No resources yet" action={<ButtonLink href="/admin/resources/new" size="sm">Add a resource</ButtonLink>} />}
      />
    </div>
  );
}
