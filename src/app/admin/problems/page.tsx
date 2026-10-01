/* eslint-disable @typescript-eslint/no-explicit-any */
import { ListChecks } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ActionButton, AdminForm, SelectInput, SubmitButton, TextArea } from "@/components/admin/form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { bulkAddProblems, deleteProblem, publishAllProblems, setProblemPublished } from "./actions";

export const metadata = { title: "Coding problems" };
const LABEL: Record<string, string> = { leetcode: "LeetCode", hackerrank: "HackerRank", geeksforgeeks: "GfG", codeforces: "Codeforces", other: "Other" };

export default async function ProblemsAdmin({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["order_index", "title", "created_at"], defaultSort: "order_index", defaultDir: "asc", filters: ["course", "status", "platform"] });
  let q = ctx.supabase.from("coding_problems").select("id,title,url,platform,difficulty,is_published,course_id,course:courses(title),module:course_modules(title)", { count: "exact" });
  if (p.q) q = q.ilike("title", ilikeTerm(p.q));
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  if (p.filters.status) q = q.eq("is_published", p.filters.status === "published");
  if (p.filters.platform) q = q.eq("platform", p.filters.platform);
  const [{ data, count, error }, courses] = await Promise.all([q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1), courseOptions(ctx)]);
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminHeader title="Coding problems" description="External practice problems (LeetCode, HackerRank…) shown to enrolled learners as a tick-to-track sheet." />
      {error ? <p role="alert" className="rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">Couldn&apos;t load problems — run migration <code className="text-xs">20261002090000_coding_problems.sql</code> in Supabase.</p> : null}
      <details className="rounded-xl border border-border bg-card p-5">
        <summary className="cursor-pointer text-sm font-semibold">Bulk add problems</summary>
        <AdminForm action={bulkAddProblems} resetOnSuccess className="mt-4 space-y-4">
          <SelectInput name="course_id" label="Course" required defaultValue={p.filters.course} options={courses.filter((c) => !c.is_demo).map((c) => [c.id, c.title])} placeholder="Choose a course" />
          <TextArea name="lines" label="One problem per line" rows={6} mono required placeholder={"Two Sum | https://leetcode.com/problems/two-sum/ | easy | JavaScript\nPython If-Else | https://www.hackerrank.com/challenges/py-if-else/problem | easy"} hint="Format: Title | https URL | easy/medium/hard | module title (optional). Added as drafts; duplicates are skipped." />
          <SubmitButton>Add as drafts</SubmitButton>
        </AdminForm>
      </details>
      <Toolbar params={p} placeholder="Search problems" filters={[
        { name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) },
        { name: "status", label: "Status", options: [["published", "Published"], ["draft", "Draft"]] },
        { name: "platform", label: "Platform", options: Object.entries(LABEL) },
      ]}>
        {p.filters.course ? <ActionButton action={publishAllProblems} hidden={{ course_id: p.filters.course }} size="sm" confirm="Publish every draft problem in this course?">Publish all drafts</ActionButton> : null}
      </Toolbar>
      <DataTable base="/admin/problems" params={p} total={count ?? 0}
        columns={[{ key: "title", label: "Problem", sortable: true }, { key: "course", label: "Course / module" }, { key: "platform", label: "Platform" }, { key: "difficulty", label: "Difficulty" }, { key: "status", label: "Status" }, { key: "a", label: "", className: "text-right" }]}
        rows={(data ?? []).map((r: any) => ({ key: r.id, cells: [
          <a key="t" href={r.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-primary">{r.title}</a>,
          <span key="c" className="block max-w-[16rem] truncate text-xs text-muted-foreground">{r.course?.title}{r.module ? ` · ${r.module.title}` : " · More practice"}</span>,
          <span key="p" className="text-xs">{LABEL[r.platform] ?? r.platform}</span>,
          <span key="d" className="text-xs capitalize">{r.difficulty ?? "—"}</span>,
          <StatusPill key="s" status={r.is_published ? "published" : "draft"} />,
          <span key="a" className="flex justify-end gap-2">
            <ActionButton action={setProblemPublished} hidden={{ id: r.id, value: String(!r.is_published) }} variant="ghost" size="sm">{r.is_published ? "Unpublish" : "Publish"}</ActionButton>
            <ActionButton action={deleteProblem} hidden={{ id: r.id }} confirm={`Delete “${r.title}”?`} variant="ghost" size="sm">Delete</ActionButton>
          </span>,
        ] }))}
        empty={<EmptyState icon={ListChecks} title="No coding problems yet" description="Use “Bulk add problems” above, or run the seed migration for the Full Stack course." />}
      />
    </div>
  );
}
