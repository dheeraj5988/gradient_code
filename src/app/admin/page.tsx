import Link from "next/link";
import { AlertTriangle, ArrowRight, BookOpen, CircleDollarSign, FileQuestion, GraduationCap, ShoppingCart, Award, Briefcase, Users } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/admin/guard";
import { countOf, courseStats, profilesById } from "@/lib/admin/queries";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminDashboard() {
  const ctx = (await requireAdminPage())!;
  const s = ctx.supabase;
  const [students, courses, published, drafts, demo, enrollments, orders, questions, certificates, applications, paid, recentEnr, recentCourses, draftCourses, recentQs, stats] = await Promise.all([
    countOf(ctx, "user_roles", (q) => q.eq("role", "student")),
    countOf(ctx, "courses", (q) => q.neq("status", "archived")),
    countOf(ctx, "courses", (q) => q.eq("status", "published").eq("is_demo", false)),
    countOf(ctx, "courses", (q) => q.eq("status", "draft")),
    countOf(ctx, "courses", (q) => q.eq("is_demo", true)),
    countOf(ctx, "enrollments"),
    countOf(ctx, "orders"),
    countOf(ctx, "practice_questions", (q) => q.is("archived_at", null)),
    countOf(ctx, "certificates"),
    countOf(ctx, "internship_applications"),
    s.from("orders").select("amount").in("status", ["paid", "captured"]).limit(10000),
    s.from("enrollments").select("id,user_id,source,enrolled_at,course:courses(title)").order("enrolled_at", { ascending: false }).limit(6),
    s.from("courses").select("id,title,status,is_demo,updated_at").order("updated_at", { ascending: false }).limit(6),
    s.from("courses").select("id,title,updated_at").eq("status", "draft").order("updated_at", { ascending: false }).limit(6),
    s.from("practice_questions").select("id,title,updated_at,is_published,course:courses(title)").order("updated_at", { ascending: false }).limit(5),
    courseStats(ctx),
  ]);
  const revenue = (paid.data ?? []).reduce((sum: number, o: { amount: number }) => sum + Number(o.amount || 0), 0);
  const names = await profilesById(ctx, (recentEnr.data ?? []).map((e: { user_id: string }) => e.user_id));
  const { data: allCourses } = await s.from("courses").select("id,title,status,is_demo").neq("status", "archived");
  const missing = (allCourses ?? []).filter((c) => (stats.get(c.id)?.published_lessons ?? 0) === 0 && !c.is_demo);
  const mediaGaps = (allCourses ?? []).filter((c) => (stats.get(c.id)?.video_lessons_missing_media ?? 0) > 0 && !c.is_demo);

  const cards = [
    { icon: Users, label: "Students", value: students },
    { icon: BookOpen, label: "Courses", value: courses, sub: `${published ?? 0} live · ${drafts ?? 0} draft${demo ? ` · ${demo} demo` : ""}` },
    { icon: GraduationCap, label: "Enrollments", value: enrollments },
    { icon: ShoppingCart, label: "Orders", value: orders },
    { icon: CircleDollarSign, label: "Revenue (paid orders)", value: revenue ? formatPrice(revenue) : "₹0" },
    { icon: FileQuestion, label: "Practice questions", value: questions },
    { icon: Award, label: "Certificates", value: certificates },
    { icon: Briefcase, label: "Internship applications", value: applications },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <AdminHeader title="Dashboard" description="Live numbers from your database." actions={<><ButtonLink href="/admin/import" variant="outline" size="sm">Import from Drive</ButtonLink><ButtonLink href="/admin/courses/new" size="sm">New course</ButtonLink></>} />
      <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-border bg-card p-4">
            <c.icon className="h-4 w-4 text-primary" aria-hidden />
            <p className="mt-2 text-2xl font-bold tabular-nums">{c.value ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            {c.sub ? <p className="mt-0.5 text-[11px] text-subtle-foreground">{c.sub}</p> : null}
          </div>
        ))}
      </section>

      {missing.length || mediaGaps.length || drafts ? (
        <section className="mt-6 rounded-xl border border-warning/30 bg-warning-soft p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-warning"><AlertTriangle className="h-4 w-4" aria-hidden />Needs attention</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {missing.map((c) => <li key={c.id}><Link href={`/admin/courses/${c.id}/curriculum`} className="hover:underline">{c.title}</Link> — no published lessons</li>)}
            {mediaGaps.map((c) => <li key={c.id}><Link href={`/admin/courses/${c.id}/curriculum`} className="hover:underline">{c.title}</Link> — {stats.get(c.id)!.video_lessons_missing_media} video lesson(s) without media</li>)}
            {drafts ? <li><Link href="/admin/courses?status=draft" className="hover:underline">{drafts} draft course{drafts > 1 ? "s" : ""}</Link> waiting to be reviewed and published</li> : null}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Recent enrollments" href="/admin/enrollments">
          {(recentEnr.data ?? []).length ? (
            <ul className="divide-y divide-border">
              {(recentEnr.data as unknown as { id: string; user_id: string; source: string; enrolled_at: string; course: { title: string } | null }[]).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0"><span className="block truncate font-medium">{names.get(e.user_id)?.full_name || names.get(e.user_id)?.email || "Unknown user"}</span><span className="block truncate text-xs text-muted-foreground">{e.course?.title}</span></span>
                  <span className="shrink-0 text-right text-xs text-muted-foreground"><span className="block capitalize">{e.source.replace("_", " ")}</span>{fmtDate(e.enrolled_at)}</span>
                </li>
              ))}
            </ul>
          ) : <Empty text="No enrollments yet." />}
        </Panel>
        <Panel title="Recently updated courses" href="/admin/courses">
          <ul className="divide-y divide-border">
            {(recentCourses.data ?? []).map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link href={`/admin/courses/${c.id}/edit`} className="min-w-0 truncate font-medium hover:text-primary">{c.title}</Link>
                <span className="flex shrink-0 items-center gap-2">{c.is_demo ? <StatusPill status="demo" /> : null}<StatusPill status={c.status} /><span className="text-xs text-muted-foreground">{fmtDate(c.updated_at)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Draft courses" href="/admin/courses?status=draft">
          {(draftCourses.data ?? []).length ? (
            <ul className="divide-y divide-border">{(draftCourses.data ?? []).map((c) => <li key={c.id} className="flex justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/courses/${c.id}/edit`} className="truncate font-medium hover:text-primary">{c.title}</Link><span className="text-xs text-muted-foreground">{fmtDate(c.updated_at)}</span></li>)}</ul>
          ) : <Empty text="No drafts." />}
        </Panel>
        <Panel title="Recently modified questions" href="/admin/questions">
          {(recentQs.data ?? []).length ? (
            <ul className="divide-y divide-border">
              {(recentQs.data as unknown as { id: string; title: string; updated_at: string; is_published: boolean; course: { title: string } | null }[]).map((q) => (
                <li key={q.id} className="flex justify-between gap-3 py-2.5 text-sm"><span className="min-w-0"><Link href={`/admin/questions/${q.id}`} className="block truncate font-medium hover:text-primary">{q.title}</Link><span className="block truncate text-xs text-muted-foreground">{q.course?.title}</span></span><StatusPill status={q.is_published ? "published" : "draft"} /></li>
              ))}
            </ul>
          ) : <Empty text="No practice questions yet." />}
        </Panel>
      </div>
    </div>
  );
}

function Panel({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3"><h2 className="text-sm font-semibold">{title}</h2><Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">View all <ArrowRight className="h-3 w-3" aria-hidden /></Link></div>
      <div className="px-5 py-2">{children}</div>
    </section>
  );
}
function Empty({ text }: { text: string }) { return <p className="py-4 text-sm text-muted-foreground">{text}</p>; }
