/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { AdminHeader, DataTable, StatusPill, Toolbar } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { DifficultyBadge, TYPE_LABEL } from "@/components/practice/bits";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { ilikeTerm, parseList } from "@/lib/admin/util";
import { duplicateQuestion, setQuestionState } from "../content-actions";

export const metadata = { title: "Questions" };

export default async function Questions({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["title", "difficulty", "updated_at", "order_index"], defaultSort: "updated_at", filters: ["course", "topic", "difficulty", "type", "status", "category"] });
  let q = ctx.supabase.from("practice_questions").select("id,title,type,difficulty,category,is_published,archived_at,updated_at,course:courses(title),topic:course_topics(name),module:course_modules(title)", { count: "exact" });
  if (p.q) q = q.or(`title.ilike.${ilikeTerm(p.q)},prompt.ilike.${ilikeTerm(p.q)}`);
  if (p.filters.course) q = q.eq("course_id", p.filters.course);
  if (p.filters.topic) q = q.eq("topic_id", p.filters.topic);
  if (p.filters.difficulty) q = q.eq("difficulty", p.filters.difficulty);
  if (p.filters.type) q = q.eq("type", p.filters.type);
  if (p.filters.category) q = q.eq("category", p.filters.category);
  if (p.filters.status === "published") q = q.eq("is_published", true).is("archived_at", null);
  else if (p.filters.status === "draft") q = q.eq("is_published", false).is("archived_at", null);
  else if (p.filters.status === "archived") q = q.not("archived_at", "is", null);
  else q = q.is("archived_at", null);
  const [{ data, count }, courses, { data: topics }] = await Promise.all([
    q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1),
    courseOptions(ctx),
    ctx.supabase.from("course_topics").select("id,name,course:courses(title)").order("name"),
  ]);
  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader title="Question bank" description="Practice and interview questions. Answer keys are stored separately and never sent to learners before they submit." actions={<ButtonLink href="/admin/questions/new" size="sm">New question</ButtonLink>} />
      <Toolbar params={p} placeholder="Search title or question text" filters={[
        { name: "course", label: "Course", options: courses.map((c) => [c.id, c.title]) },
        { name: "topic", label: "Topic", options: (topics ?? []).map((t: any) => [t.id, `${t.name} (${t.course?.title ?? ""})`]) },
        { name: "difficulty", label: "Difficulty", options: [["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]] },
        { name: "type", label: "Type", options: Object.entries(TYPE_LABEL) },
        { name: "category", label: "Use", options: [["practice", "Practice"], ["interview", "Interview"]] },
        { name: "status", label: "Status", options: [["published", "Published"], ["draft", "Draft"], ["archived", "Archived"]] },
      ]} />
      <DataTable base="/admin/questions" params={p} total={count ?? 0}
        columns={[{ key: "title", label: "Question", sortable: true }, { key: "course", label: "Course / topic" }, { key: "type", label: "Type" }, { key: "difficulty", label: "Difficulty", sortable: true }, { key: "status", label: "Status" }, { key: "updated_at", label: "Updated", sortable: true }, { key: "a", label: "", className: "text-right" }]}
        rows={(data ?? []).map((x: any) => ({ key: x.id, cells: [
          <span key="t" className="block max-w-xs"><Link href={`/admin/questions/${x.id}`} className="font-medium hover:text-primary">{x.title}</Link>{x.category === "interview" ? <span className="block text-[11px] text-subtle-foreground">Interview prep</span> : null}</span>,
          <span key="c" className="block max-w-[14rem] truncate text-xs text-muted-foreground">{x.course?.title}{x.topic ? ` · ${x.topic.name}` : ""}</span>,
          <span key="ty" className="text-xs">{TYPE_LABEL[x.type as keyof typeof TYPE_LABEL]}</span>,
          <DifficultyBadge key="d" d={x.difficulty} />,
          <StatusPill key="s" status={x.archived_at ? "archived" : x.is_published ? "published" : "draft"} />,
          <span key="u" className="text-xs whitespace-nowrap text-muted-foreground">{new Date(x.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>,
          <span key="a" className="flex justify-end gap-1">
            <ActionButton action={setQuestionState} hidden={{ id: x.id, state: x.is_published ? "unpublish" : "publish" }} variant="ghost" size="sm">{x.is_published ? "Unpublish" : "Publish"}</ActionButton>
            <ActionButton action={duplicateQuestion} hidden={{ id: x.id }} variant="ghost" size="sm">Duplicate</ActionButton>
            {x.archived_at ? <ActionButton action={setQuestionState} hidden={{ id: x.id, state: "restore" }} variant="ghost" size="sm">Restore</ActionButton> : <ActionButton action={setQuestionState} hidden={{ id: x.id, state: "archive" }} confirm="Archive this question? Learners' past attempts are kept." variant="ghost" size="sm">Archive</ActionButton>}
          </span>,
        ] }))}
        empty={<EmptyState icon={HelpCircle} title="No questions match" action={<ButtonLink href="/admin/questions/new" size="sm">Create a question</ButtonLink>} />}
      />
    </div>
  );
}
