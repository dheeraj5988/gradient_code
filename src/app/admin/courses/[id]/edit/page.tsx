import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/table";
import { CourseForm } from "@/components/admin/course-form";
import { ActionButton } from "@/components/admin/form";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadCompleteness } from "@/lib/admin/course-data";
import { duplicateCourse, setCourseStatus } from "../../actions";

export const metadata = { title: "Edit course" };

export default async function EditCourse({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const { created } = await searchParams;
  const loaded = await loadCompleteness(ctx, id).catch(() => null);
  if (!loaded) notFound();
  const { course, result } = loaded;
  const { data: instructors } = await ctx.supabase.from("instructors").select("id,name").order("name");

  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader
        title={course.title}
        crumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.title }]}
        description={<span className="flex flex-wrap items-center gap-2"><StatusPill status={course.status} />{course.is_demo ? <StatusPill status="demo" /> : null}<span className="font-mono text-xs">/courses/{course.slug}</span></span>}
        actions={<><ButtonLink href={`/admin/courses/${id}/curriculum`} variant="outline" size="sm">Curriculum</ButtonLink><ButtonLink href={`/courses/${course.slug}`} target="_blank" variant="ghost" size="sm">Preview page</ButtonLink></>}
      />
      {created ? <p role="status" className="mb-4 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">Draft created. Add modules and lessons in the curriculum, then publish when it&apos;s ready.</p> : null}
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="min-w-0"><CourseForm course={course} instructors={instructors ?? []} /></div>
        <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between"><h2 className="text-sm font-semibold">Content completeness</h2><span className="text-sm font-semibold tabular-nums">{result.percent}%</span></div>
            <ProgressBar value={result.percent} className="mt-2" label="Course completeness" tone={result.canPublish ? "success" : "primary"} />
            <p className="mt-2 text-xs text-muted-foreground">{result.stats.modules} modules · {result.stats.published}/{result.stats.lessons} lessons published</p>
            <ul className="mt-4 space-y-2">
              {result.checks.map((c) => (
                <li key={c.key} className="flex items-start gap-2 text-sm">
                  {c.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Done" /> : c.required ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-label="Required" /> : <Circle className="mt-0.5 h-4 w-4 shrink-0 text-subtle-foreground" aria-label="Recommended" />}
                  <span><span className={c.ok ? "text-muted-foreground" : ""}>{c.label}</span>{!c.ok && c.required ? <span className="ml-1 text-[11px] font-semibold text-danger">required</span> : null}{c.detail ? <span className="block text-xs text-muted-foreground">{c.detail}</span> : null}</span>
                </li>
              ))}
            </ul>
          </section>
          <section className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">Publishing</h2>
            {course.status !== "published" ? (
              <div>
                <ActionButton action={setCourseStatus} hidden={{ id, status: "published" }} confirm={`Publish “${course.title}”? It will be visible to everyone${course.is_demo ? " (demo courses stay hidden from the catalog)" : ""}.`} size="sm">Publish course</ActionButton>
                {!result.canPublish ? <p className="mt-1 text-xs text-muted-foreground">Fix the required items first.</p> : null}
              </div>
            ) : <ActionButton action={setCourseStatus} hidden={{ id, status: "draft" }} confirm="Unpublish? Learners who are enrolled keep access, but the course disappears from the catalog." variant="outline" size="sm">Unpublish (move to draft)</ActionButton>}
            <div className="flex flex-wrap gap-2 border-t border-border pt-3">
              <ActionButton action={duplicateCourse} hidden={{ id }} variant="outline" size="sm">Duplicate</ActionButton>
              {course.status !== "archived" ? <ActionButton action={setCourseStatus} hidden={{ id, status: "archived" }} confirm="Archive this course? It will be hidden from the catalog and admin lists (data is kept)." variant="ghost" size="sm">Archive</ActionButton> : <ActionButton action={setCourseStatus} hidden={{ id, status: "draft" }} variant="ghost" size="sm">Restore to draft</ActionButton>}
            </div>
            <p className="text-xs text-muted-foreground">Nothing is deleted. <Link href={`/admin/audit?entity=${id}`} className="text-primary hover:underline">View history</Link></p>
          </section>
        </aside>
      </div>
    </div>
  );
}
