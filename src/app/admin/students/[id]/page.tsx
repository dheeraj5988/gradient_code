/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, StatusPill } from "@/components/admin/table";
import { ActionButton } from "@/components/admin/form";
import { GrantEnrollmentForm } from "@/components/admin/user-forms";
import { ProgressBar } from "@/components/ui/progress-bar";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions, courseStats } from "@/lib/admin/queries";
import { revokeEnrollment } from "../../user-actions";

export const metadata = { title: "Student" };

export default async function StudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const s = ctx.supabase;
  const { data: profile } = await s.from("profiles").select("id,full_name,email,phone,bio,is_active,created_at").eq("id", id).maybeSingle();
  if (!profile) notFound();
  const [{ data: enrollments }, { data: done }, { count: attempts }, { count: correct }, { data: certs }, { data: apps }, courses] = await Promise.all([
    s.from("enrollments").select("id,course_id,source,enrolled_at,expires_at,notes,course:courses(title,slug)").eq("user_id", id).order("enrolled_at", { ascending: false }),
    s.from("lesson_progress").select("lesson_id, lesson:lessons(module:course_modules(course_id))").eq("user_id", id),
    s.from("question_attempts").select("id", { count: "exact", head: true }).eq("user_id", id),
    s.from("question_attempts").select("id", { count: "exact", head: true }).eq("user_id", id).eq("is_correct", true),
    s.from("certificates").select("id,certificate_number,issued_at,course:courses(title)").eq("user_id", id),
    s.from("internship_applications").select("id,status,created_at,internship:internships(title)").eq("user_id", id),
    courseOptions(ctx),
  ]);
  const stats = await courseStats(ctx, (enrollments ?? []).map((e) => e.course_id));
  const doneByCourse = new Map<string, number>();
  (done ?? []).forEach((d: any) => { const c = d.lesson?.module?.course_id; if (c) doneByCourse.set(c, (doneByCourse.get(c) ?? 0) + 1); });
  const enrolledIds = new Set((enrollments ?? []).map((e) => e.course_id));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminHeader title={profile.full_name || profile.email || "Student"} crumbs={[{ label: "Students", href: "/admin/students" }, { label: profile.full_name || "Student" }]} description={<span className="flex flex-wrap items-center gap-2">{profile.email}<StatusPill status={profile.is_active ? "active" : "expired"} />Joined {new Date(profile.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>} />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[["Enrollments", enrollments?.length ?? 0], ["Lessons completed", done?.length ?? 0], ["Practice attempts", attempts ?? 0], ["Correct answers", correct ?? 0]].map(([l, v]) => (
          <div key={l as string} className="rounded-xl border border-border bg-card p-4"><p className="text-2xl font-bold tabular-nums">{v}</p><p className="text-xs text-muted-foreground">{l}</p></div>
        ))}
      </section>
      <section className="rounded-xl border border-border bg-card">
        <h2 className="border-b border-border px-5 py-3 text-sm font-semibold">Enrollments & progress</h2>
        {enrollments?.length ? (
          <ul className="divide-y divide-border">
            {(enrollments as any[]).map((e) => {
              const total = stats.get(e.course_id)?.published_lessons ?? 0;
              const d = doneByCourse.get(e.course_id) ?? 0;
              const pct = total ? Math.round((d / total) * 100) : 0;
              const expired = e.expires_at && new Date(e.expires_at) < new Date();
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-4 px-5 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.course?.title}</p>
                    <p className="text-xs text-muted-foreground capitalize">{e.source.replace("_", " ")} · {new Date(e.enrolled_at).toLocaleDateString("en-IN")}{e.expires_at ? ` · until ${new Date(e.expires_at).toLocaleDateString("en-IN")}` : ""}{e.notes ? ` · “${e.notes}”` : ""}</p>
                  </div>
                  <div className="w-40"><ProgressBar value={pct} size="sm" label="Course progress" /><p className="mt-1 text-xs text-muted-foreground tabular-nums">{d}/{total} lessons · {pct}%</p></div>
                  <StatusPill status={expired ? "expired" : "active"} />
                  {e.source !== "payment" ? <ActionButton action={revokeEnrollment} hidden={{ id: e.id }} confirm="Revoke this learner's access? Their progress is kept." variant="ghost" size="sm">Revoke</ActionButton> : null}
                </li>
              );
            })}
          </ul>
        ) : <p className="px-5 py-4 text-sm text-muted-foreground">Not enrolled in any course.</p>}
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">Grant course access</h2>
        <GrantEnrollmentForm courses={courses.filter((c) => !enrolledIds.has(c.id) && c.status !== "archived")} defaultStudent={profile.email ?? ""} />
      </section>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Certificates</h2>
          {certs?.length ? <ul className="space-y-1 text-sm">{(certs as any[]).map((c) => <li key={c.id}>{c.course?.title} · <span className="font-mono text-xs">{c.certificate_number}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None issued.</p>}
        </section>
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-semibold">Internship applications</h2>
          {apps?.length ? <ul className="space-y-1 text-sm">{(apps as any[]).map((a) => <li key={a.id}>{a.internship?.title} · <span className="capitalize">{a.status}</span></li>)}</ul> : <p className="text-sm text-muted-foreground">None.</p>}
        </section>
      </div>
      <p className="text-xs text-muted-foreground">Personal notes are private to the learner and are not visible to admins. <Link href={`/admin/audit?entity=${id}`} className="text-primary hover:underline">Admin history</Link></p>
    </div>
  );
}
