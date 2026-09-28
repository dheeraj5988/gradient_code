import Link from "next/link";
import { BookOpen } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseStats } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Courses" };

export default async function AdminCourses({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["title", "price", "updated_at", "status", "track"], defaultSort: "updated_at", filters: ["status", "level", "track", "demo"] });
  let q = ctx.supabase.from("courses").select("id,title,slug,track,level,price,status,is_demo,updated_at", { count: "exact" });
  if (p.q) q = q.or(`title.ilike.${ilikeTerm(p.q)},slug.ilike.${ilikeTerm(p.q)}`);
  if (p.filters.status) q = q.eq("status", p.filters.status);
  else q = q.neq("status", "archived");
  if (p.filters.level) q = q.eq("level", p.filters.level);
  if (p.filters.track) q = q.eq("track", p.filters.track);
  if (p.filters.demo) q = q.eq("is_demo", p.filters.demo === "yes");
  const { data, count } = await q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const rows = data ?? [];
  const stats = await courseStats(ctx, rows.map((r) => r.id));
  const { data: tracks } = await ctx.supabase.from("courses").select("track");
  const trackOpts = [...new Set((tracks ?? []).map((t) => t.track))].sort().map((t) => [t, t] as [string, string]);

  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader title="Courses" description="Create, edit and publish courses. Archived courses are hidden unless filtered." actions={<><ButtonLink href="/admin/import" variant="outline" size="sm">Import from Drive</ButtonLink><ButtonLink href="/admin/courses/new" size="sm">New course</ButtonLink></>} />
      <Toolbar params={p} placeholder="Search title or slug" filters={[
        { name: "status", label: "Status", options: [["published", "Published"], ["draft", "Draft"], ["archived", "Archived"]] },
        { name: "level", label: "Level", options: [["Beginner", "Beginner"], ["Intermediate", "Intermediate"], ["Advanced", "Advanced"], ["All levels", "All levels"]] },
        { name: "track", label: "Category", options: trackOpts },
        { name: "demo", label: "Demo", options: [["no", "Real courses"], ["yes", "Demo only"]] },
      ]} />
      <DataTable
        base="/admin/courses"
        params={p}
        total={count ?? 0}
        columns={[{ key: "title", label: "Course", sortable: true }, { key: "track", label: "Category", sortable: true }, { key: "level", label: "Level" }, { key: "price", label: "Price", sortable: true }, { key: "status", label: "Status", sortable: true }, { key: "modules", label: "Modules", className: "text-right" }, { key: "lessons", label: "Lessons", className: "text-right" }, { key: "updated_at", label: "Updated", sortable: true }, { key: "actions", label: "", className: "text-right" }]}
        rows={rows.map((c) => {
          const st = stats.get(c.id);
          return {
            key: c.id,
            cells: [
              <span key="t" className="block max-w-xs"><Link href={`/admin/courses/${c.id}/edit`} className="font-medium hover:text-primary">{c.title}</Link><span className="block truncate font-mono text-[11px] text-subtle-foreground">/{c.slug}</span></span>,
              <span key="k" className="text-muted-foreground">{c.track}</span>,
              c.level,
              <span key="p" className="tabular-nums">{formatPrice(Number(c.price))}</span>,
              <span key="s" className="flex gap-1"><StatusPill status={c.status} />{c.is_demo ? <StatusPill status="demo" /> : null}</span>,
              <span key="m" className="tabular-nums">{st?.modules ?? 0}</span>,
              <span key="l" className="tabular-nums">{st?.published_lessons ?? 0}<span className="text-subtle-foreground">/{st?.lessons ?? 0}</span></span>,
              <span key="u" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(c.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}</span>,
              <span key="a" className="flex justify-end gap-3 text-xs font-medium whitespace-nowrap">
                <Link href={`/admin/courses/${c.id}/edit`} className="text-primary hover:underline">Edit</Link>
                <Link href={`/admin/courses/${c.id}/curriculum`} className="text-primary hover:underline">Curriculum</Link>
                <Link href={`/courses/${c.slug}`} target="_blank" className="text-muted-foreground hover:underline">View</Link>
              </span>,
            ],
          };
        })}
        empty={<EmptyState icon={BookOpen} title="No courses match" action={<ButtonLink href="/admin/courses/new" size="sm">Create a course</ButtonLink>} />}
      />
    </div>
  );
}
