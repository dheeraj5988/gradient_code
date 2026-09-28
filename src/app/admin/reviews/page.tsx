/* eslint-disable @typescript-eslint/no-explicit-any */
import { Star } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions, profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";
import { moderateReview } from "../user-actions";

export const metadata = { title: "Reviews" };

export default async function Reviews({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["created_at", "rating"], defaultSort: "created_at", filters: ["course", "status"] });
  let q = ctx.supabase.from("course_reviews").select("id,user_id,rating,body,is_hidden,created_at,course:courses(title)", { count: "exact" });
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  if (p.filters.status) q = q.eq("is_hidden", p.filters.status === "hidden");
  if (p.q) q = q.ilike("body", `%${p.q.replace(/[%_]/g, "")}%`);
  const [{ data, count }, courses] = await Promise.all([q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1), courseOptions(ctx)]);
  const people = await profilesById(ctx, (data ?? []).map((r: any) => r.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Reviews" description="Only enrolled learners can post reviews. Hidden reviews are excluded from ratings." />
      <Toolbar params={p} placeholder="Search review text" filters={[{ name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) }, { name: "status", label: "Status", options: [["visible", "Visible"], ["hidden", "Hidden"]] }]} />
      <DataTable base="/admin/reviews" params={p} total={count ?? 0}
        columns={[{ key: "rating", label: "Rating", sortable: true }, { key: "body", label: "Review" }, { key: "who", label: "Learner / course" }, { key: "created_at", label: "Date", sortable: true }, { key: "status", label: "Status" }, { key: "a", label: "", className: "text-right" }]}
        rows={(data ?? []).map((r: any) => ({ key: r.id, cells: [
          <span key="r" className="text-rating">{"★".repeat(r.rating)}</span>,
          <p key="b" className="line-clamp-3 max-w-md text-sm">{r.body || <span className="text-muted-foreground">(no text)</span>}</p>,
          <span key="w" className="block text-xs text-muted-foreground">{people.get(r.user_id)?.email ?? "—"}<br />{r.course?.title}</span>,
          <span key="d" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-IN")}</span>,
          <StatusPill key="s" status={r.is_hidden ? "hidden" : "published"} />,
          <ActionButton key="a" action={moderateReview} hidden={{ id: r.id, hide: String(!r.is_hidden) }} confirm={r.is_hidden ? undefined : "Hide this review from the public course page?"} variant="ghost" size="sm">{r.is_hidden ? "Restore" : "Hide"}</ActionButton>,
        ] }))}
        empty={<EmptyState icon={Star} title="No reviews yet" description="Reviews appear here once enrolled learners post them." />}
      />
    </div>
  );
}
