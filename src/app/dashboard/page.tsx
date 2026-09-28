import Link from "next/link";
import { ArrowRight, Award, BookOpen, Briefcase, CheckCircle2, ClipboardCheck, Code2, FolderGit2, PlayCircle, UserRound } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { getLearnerSummary, getMyCourses } from "@/lib/data/queries";
import { getNextLessons, getPracticeSummaries } from "@/lib/data/learning";
import { getUser } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/utils";
import { ProgressCard } from "./progress-card";

export const metadata = { title: "Dashboard" };

function Panel({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function NotYet({ icon: Icon, text }: { icon: typeof Code2; text: string }) {
  return (
    <p className="flex items-start gap-3 text-sm text-muted-foreground">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />{text}
    </p>
  );
}

export default async function DashboardPage() {
  const user = await getUser();
  const uid = user?.id ?? null;
  const courses = await getMyCourses(uid);
  const [summary, upNext, practice] = await Promise.all([getLearnerSummary(uid), getNextLessons(uid, courses), getPracticeSummaries(uid, courses.map((c) => c.id))]);
  const practiceRows = courses.filter((c) => practice.has(c.id)).map((c) => ({ c, ...practice.get(c.id)! }));
  const inProgress = courses.filter((c) => c.progress > 0 && c.progress < 100);
  const completed = courses.filter((c) => c.progress === 100).length;
  const resume = inProgress[0] ?? courses.find((c) => c.progress < 100);
  const resumeNext = upNext.find((u) => u.course.id === resume?.id);
  const first = ((user?.user_metadata?.full_name as string) || "").split(" ")[0];

  const stats = [
    { icon: BookOpen, label: "Enrolled", value: courses.length },
    { icon: PlayCircle, label: "In progress", value: inProgress.length },
    { icon: CheckCircle2, label: "Completed", value: completed },
    { icon: Award, label: "Certificates", value: summary.certificates },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">{first ? `Welcome back, ${first}` : "Welcome back"}</h1>
        <p className="mt-1 text-muted-foreground">Here&apos;s where you are in your learning.</p>
      </div>

      {/* Continue learning */}
      {resume ? (
        <section aria-labelledby="continue" className="flex flex-col gap-6 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
          <ProgressRing value={resume.progress} size={76} label={`${resume.title}: ${resume.progress}% complete`} />
          <div className="min-w-0 flex-1">
            <p id="continue" className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">Continue learning</p>
            <h2 className="mt-1 text-lg font-semibold">{resume.title}</h2>
            {resumeNext ? <p className="mt-1 text-sm text-muted-foreground">Next: {resumeNext.lessonTitle}{resumeNext.duration ? ` · ${formatDuration(resumeNext.duration)}` : ""}</p> : null}
          </div>
          <ButtonLink href={resumeNext ? `/learn/${resume.slug}/lesson/${resumeNext.lessonId}` : `/learn/${resume.slug}`}>
            <PlayCircle className="h-4 w-4" aria-hidden />{resume.progress ? "Resume" : "Start course"}
          </ButtonLink>
        </section>
      ) : null}

      {/* Overview stats — real counts only */}
      <section aria-label="Learning overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4">
            <s.icon className="h-5 w-5 text-primary" aria-hidden />
            <p className="mt-3 text-2xl font-bold tabular-nums">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          {/* Courses */}
          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My courses</h2>
              {courses.length > 3 ? <Link href="/dashboard/courses" className="text-sm font-medium text-primary hover:underline">View all</Link> : null}
            </div>
            {courses.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{courses.slice(0, 3).map((c) => <ProgressCard key={c.id} c={c} />)}</div>
            ) : (
              <EmptyState icon={BookOpen} title="You haven't enrolled in a course yet" description="Browse the catalog and preview a lesson free." action={<ButtonLink href="/courses" size="sm">Explore courses</ButtonLink>} />
            )}
          </section>

          {/* Upcoming tasks */}
          <Panel title="Up next">
            {upNext.length ? (
              <ul className="-my-3 divide-y divide-border">
                {upNext.map((u) => (
                  <li key={u.course.id}>
                    <Link href={`/learn/${u.course.slug}/lesson/${u.lessonId}`} className="group flex items-center gap-3 py-3">
                      <PlayCircle className="h-5 w-5 shrink-0 text-subtle-foreground group-hover:text-primary" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">{u.lessonTitle}</span>
                        <span className="block truncate text-xs text-muted-foreground">{u.course.title}</span>
                      </span>
                      {u.duration ? <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(u.duration)}</span> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No pending lessons. Enroll in a course to see your next steps here.</p>
            )}
          </Panel>

          <div className="grid gap-6 md:grid-cols-3">
            <Panel title="Practice">
              {practiceRows.length ? (
                <ul className="space-y-3">
                  {practiceRows.map(({ c, total, solved }) => (
                    <li key={c.id}>
                      <Link href={`/learn/${c.slug}/practice`} className="block hover:text-primary">
                        <span className="flex justify-between gap-2 text-sm"><span className="truncate">{c.title}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{solved}/{total}</span></span>
                        <ProgressBar value={(solved / total) * 100} size="sm" className="mt-1.5" label={`${c.title} practice`} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <NotYet icon={Code2} text="Practice questions appear here when your courses publish a question bank." />}
            </Panel>
            <Panel title="Projects"><NotYet icon={FolderGit2} text="Project submissions and review status will appear here." /></Panel>
            <Panel title="Assessments"><NotYet icon={ClipboardCheck} text="Quizzes and final assessments will appear here with your scores." /></Panel>
          </div>
        </div>

        {/* Career column */}
        <div className="space-y-6">
          <Panel title="Profile completion" action={<span className="text-sm font-semibold tabular-nums">{summary.profile.percent}%</span>}>
            <ProgressBar value={summary.profile.percent} label="Profile completion" />
            {summary.profile.missing.length ? (
              <>
                <p className="mt-4 text-xs font-medium text-muted-foreground">Still missing</p>
                <ul className="mt-2 space-y-1.5">
                  {summary.profile.missing.map((m) => <li key={m} className="flex items-center gap-2 text-sm"><span className="h-1.5 w-1.5 rounded-full bg-border-strong" aria-hidden />{m}</li>)}
                </ul>
              </>
            ) : <p className="mt-3 text-sm text-success">Your profile is complete.</p>}
            <Link href="/dashboard/profile" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Complete profile <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Panel>

          <Panel title="Certificates">
            {summary.certificates ? (
              <p className="text-sm">You&apos;ve earned <strong>{summary.certificates}</strong> certificate{summary.certificates > 1 ? "s" : ""}. <Link href="/dashboard/certificates" className="text-primary hover:underline">View</Link></p>
            ) : (
              <NotYet icon={Award} text="Complete a course's requirements to earn your first certificate." />
            )}
          </Panel>

          <Panel title="Internship eligibility">
            <NotYet icon={Briefcase} text="Eligibility is based on your course completion, projects and profile. Detailed requirements will appear here." />
            <p className="mt-3 text-sm text-muted-foreground">Applications submitted: <strong className="text-foreground tabular-nums">{summary.applications}</strong></p>
            <Link href="/internships" className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Browse internships <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Panel>

          <Panel title="Account">
            <Link href="/dashboard/profile" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><UserRound className="h-4 w-4" aria-hidden />Profile settings</Link>
          </Panel>
        </div>
      </div>
    </div>
  );
}
