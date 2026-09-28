/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Tags } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { deleteTopic } from "../content-actions";

export const metadata = { title: "Topics" };

export default async function Topics({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["name", "order_index", "created_at"], defaultSort: "order_index", defaultDir: "asc", filters: ["course"] });
  let q = ctx.supabase.from("course_topics").select("id,name,slug,order_index,course_id,course:courses(title),module:course_modules(title)", { count: "exact" });
  if (p.q) q = q.ilike("name", ilikeTerm(p.q));
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  const [{ data, count }, courses] = await Promise.all([q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1), courseOptions(ctx)]);
  const ids = (data ?? []).map((t) => t.id);
  const { data: qs } = ids.length ? await ctx.supabase.from("practice_questions").select("topic_id").in("topic_id", ids) : { data: [] };
  const counts = new Map<string, number>();
  (qs ?? []).forEach((r: { topic_id: string }) => counts.set(r.topic_id, (counts.get(r.topic_id) ?? 0) + 1));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Topics" description="Topics group practice questions inside a course (e.g. HTML, SQL, Pandas)." actions={<ButtonLink href="/admin/topics/new" size="sm">New topic</ButtonLink>} />
      <Toolbar params={p} placeholder="Search topics" filters={[{ name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) }]} />
      <DataTable base="/admin/topics" params={p} total={count ?? 0}
        columns={[{ key: "name", label: "Topic", sortable: true }, { key: "course", label: "Course" }, { key: "module", label: "Module" }, { key: "questions", label: "Questions", className: "text-right" }, { key: "order_index", label: "Order", sortable: true, className: "text-right" }, { key: "a", label: "", className: "text-right" }]}
        rows={(data ?? []).map((t: any) => ({ key: t.id, cells: [
          <Link key="n" href={`/admin/topics/${t.id}`} className="font-medium hover:text-primary">{t.name}</Link>,
          <span key="c" className="text-muted-foreground">{t.course?.title}</span>,
          <span key="m" className="text-muted-foreground">{t.module?.title ?? "—"}</span>,
          <span key="q" className="tabular-nums">{counts.get(t.id) ?? 0}</span>,
          <span key="o" className="tabular-nums">{t.order_index}</span>,
          <span key="a" className="flex justify-end gap-2"><Link href={`/admin/topics/${t.id}`} className="text-xs font-medium text-primary hover:underline">Edit</Link><ActionButton action={deleteTopic} hidden={{ id: t.id }} confirm={`Delete topic “${t.name}”?`} variant="ghost" size="sm">Delete</ActionButton></span>,
        ] }))}
        empty={<EmptyState icon={Tags} title="No topics yet" action={<ButtonLink href="/admin/topics/new" size="sm">Create a topic</ButtonLink>} />}
      />
    </div>
  );
}
