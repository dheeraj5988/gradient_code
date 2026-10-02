import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowRight, Award, CalendarDays, CheckCircle2, Code2, FolderGit2, PlayCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Panel } from "@/components/learn/portal";
import { LearningPlanForm } from "@/components/learn/learning-plan-form";
import { buildPlan, getLearningContext, getPlan, getPractice } from "@/lib/data/learning";
import { formatDuration } from "@/lib/utils";

export default async function LearnOverview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { slug } = await params;
  const { lesson } = await searchParams;
  if (lesson) redirect(`/learn/${slug}/lesson/${lesson}`); // old ?lesson= links
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const { course, progress } = ctx;
  const enrolled = ctx.access === "enrolled";
  const preview = ctx.lessons.find((l) => l.is_free_preview);

  if (!enrolled) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <h1 className="text-2xl font-bold">{course.title}</h1>
        {course.subtitle ? <p className="mt-1 text-muted-foreground">{course.subtitle}</p> : null}
        <Panel className="mt-6">
          <p className="text-sm text-muted-foreground">You&apos;re viewing this course in preview mode. {preview ? "Watch the free preview lesson, then enroll to unlock everything." : "Enroll to unlock all lessons, practice and resources."}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {preview ? <ButtonLink href={`/learn/${slug}/lesson/${preview.id}`}><PlayCircle className="h-4 w-4" aria-hidden />Watch preview</ButtonLink> : null}
            <ButtonLink href={`/courses/${slug}`} variant="outline">View enrollment options</ButtonLink>
          </div>
        </Panel>
      </div>
    );
  }

  const [practice, plan] = await Promise.all([getPractice(course.id, ctx.userId), getPlan(ctx.userId, course.id)]);
  const resume = ctx.resume;
  const resumeLesson = resume ? ctx.lessons.find((l) => l.id === resume.lessonId) : null;
  const nextModule = resumeLesson ? ctx.modules.find((m) => m.id === resumeLesson.module_id) : null;
  const remainingLessons = ctx.lessons.filter((l) => !ctx.completed.has(l.id));
  const remainingSecs = remainingLessons.reduce((s, l) => s + l.duration_seconds, 0);
  const schedule = plan
    ? buildPlan({ remainingLessons, remainingQuestions: practice.questions.filter((q) => q.state !== "correct"), targetDate: plan.target_date, hoursPerDay: plan.hours_per_day })
    : null;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div>
        <p className="text-xs font-medium text-primary">{course.track}</p>
        <h1 className="mt-1 text-2xl font-bold">{course.title}</h1>
        {course.subtitle ? <p className="mt-1 text-muted-foreground">{course.subtitle}</p> : null}
      </div>

      {/* Continue */}
      <section className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:p-6">
        <ProgressRing value={progress.percent} size={84} label={`Course ${progress.percent}% complete`} />
        <div className="min-w-0 flex-1">
          {resume ? (
            <>
              <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">{resume.updatedAt ? "Resume" : progress.completed ? "Continue learning" : "Start learning"}</p>
              <p className="mt-1 text-sm text-muted-foreground">{nextModule?.title}</p>
              <h2 className="text-lg font-semibold">{resume.lessonTitle}</h2>
            </>
          ) : (
            <>
              <p className="text-xs font-semibold tracking-wide text-success uppercase">All lessons complete</p>
              <h2 className="mt-1 text-lg font-semibold">You&apos;ve finished every lesson in this course.</h2>
            </>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {progress.completed} of {progress.total} lessons complete{remainingSecs ? ` · ${formatDuration(remainingSecs)} remaining` : ""}
          </p>
        </div>
        {resume ? <ButtonLink href={`/learn/${slug}/lesson/${resume.lessonId}`}><PlayCircle className="h-4 w-4" aria-hidden />{resume.updatedAt ? "Resume" : progress.completed ? "Continue" : "Start"}</ButtonLink> : null}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="min-w-0 space-y-6">
          <Panel title="Module progress">
            {ctx.progress.modules.length ? (
              <ul className="space-y-4">
                {ctx.progress.modules.map((m, i) => (
                  <li key={m.id}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate"><span className="text-subtle-foreground">{i + 1}.</span> {m.title}</span>
                      <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground tabular-nums">
                        {m.percent === 100 ? <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden /> : null}
                        {m.completed}/{m.total}
                      </span>
                    </div>
                    <ProgressBar value={m.percent} size="sm" tone={m.percent === 100 ? "success" : "primary"} label={`${m.title} progress`} />
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">Lessons will appear here once they are published.</p>}
          </Panel>

          <Panel title="Learning plan" action={plan && schedule ? <span className={`text-xs font-medium ${schedule.onTrack ? "text-success" : "text-warning"}`}>{schedule.onTrack ? "On track" : "Needs more time per day"}</span> : null}>
            <LearningPlanForm slug={slug} courseId={course.id} initial={plan} />
            {schedule ? (
              schedule.days.length ? (
                <ol className="mt-5 divide-y divide-border rounded-lg border border-border">
                  {schedule.days.slice(0, 5).map((d, i) => (
                    <li key={d.date} className="flex gap-4 px-4 py-3">
                      <div className="w-20 shrink-0">
                        <p className="text-sm font-semibold">{i === 0 ? "Today" : i === 1 ? "Tomorrow" : new Date(d.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</p>
                        <p className="text-xs text-muted-foreground">~{d.minutes} min</p>
                      </div>
                      <ul className="min-w-0 flex-1 space-y-1 text-sm">
                        {d.lessons.length ? <li className="flex items-start gap-2"><PlayCircle className="mt-0.5 h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden /><span className="min-w-0">{d.lessons.length} lesson{d.lessons.length > 1 ? "s" : ""}: <span className="text-muted-foreground">{d.lessons.map((l) => l.title).join(", ")}</span></span></li> : null}
                        {d.questions ? <li className="flex items-center gap-2"><Code2 className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />{d.questions} practice question{d.questions > 1 ? "s" : ""}</li> : null}
                      </ul>
                    </li>
                  ))}
                </ol>
              ) : <p className="mt-4 text-sm text-success">Nothing left to schedule — you&apos;re done.</p>
            ) : <p className="mt-3 text-xs text-muted-foreground">Set a target date to get a day-by-day plan based on your remaining lessons and practice. It updates automatically as you progress.</p>}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Practice">
            {practice.stats.total ? (
              <>
                <p className="text-2xl font-bold tabular-nums">{practice.stats.solved}<span className="text-base font-medium text-muted-foreground"> / {practice.stats.total}</span></p>
                <p className="text-sm text-muted-foreground">questions solved</p>
                <ProgressBar value={practice.stats.percent} size="sm" className="mt-3" label="Practice progress" />
                <Link href={`/learn/${slug}/practice`} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Go to practice <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </>
            ) : <p className="flex gap-2.5 text-sm text-muted-foreground"><Code2 className="h-4 w-4 shrink-0" aria-hidden />Practice content will appear here when your instructor publishes it.</p>}
          </Panel>
          <Panel title="Projects">
            <p className="flex gap-2.5 text-sm text-muted-foreground"><FolderGit2 className="h-4 w-4 shrink-0" aria-hidden />{course.includes.projects ? `This course includes ${course.includes.projects} project${course.includes.projects > 1 ? "s" : ""}. Project submission opens soon.` : "Projects for this course will appear here."}</p>
          </Panel>
          <Panel title="Certificate">
            <p className="flex gap-2.5 text-sm text-muted-foreground"><Award className="h-4 w-4 shrink-0" aria-hidden />Certificate requirements will be shown here once they are configured for this course.</p>
            <Link href={`/learn/${slug}/certificate`} className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Details <ArrowRight className="h-4 w-4" aria-hidden /></Link>
          </Panel>
          {plan ? null : (
            <Panel>
              <p className="flex gap-2.5 text-sm text-muted-foreground"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden />Tip: create a learning plan to get a daily schedule.</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
