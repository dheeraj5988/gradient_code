import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Clock, FileText, Lock, PlayCircle, Radio, X } from "lucide-react";
import { Logo } from "@/components/brand";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { CourseNavDrawer } from "@/components/learn/course-nav-drawer";
import { getCourseBySlug, getCurriculum, getPlayerCurriculum, isEnrolled } from "@/lib/data/queries";
import type { Module } from "@/lib/data/types";
import { getUser } from "@/lib/supabase/server";
import { cn, formatDuration } from "@/lib/utils";
import { toPlayerSource } from "@/lib/video";
import { toggleComplete } from "./actions";

export const metadata: Metadata = { title: "Learn", robots: { index: false, follow: false } };

function LessonList({ modules, currentId, completed, enrolled }: { modules: Module[]; currentId?: string; completed: Set<string>; enrolled: boolean }) {
  return (
    <div>
      {modules.map((m, mi) => {
        const done = m.lessons.filter((l) => completed.has(l.id)).length;
        return (
          <details key={m.id} open={m.lessons.some((l) => l.id === currentId) || (mi === 0 && !currentId)} className="group border-b border-border">
            <summary className="cursor-pointer px-4 py-3 hover:bg-surface">
              <span className="block text-xs text-subtle-foreground">Section {mi + 1}{enrolled ? ` · ${done}/${m.lessons.length}` : ""}</span>
              <span className="block text-sm font-semibold">{m.title}</span>
            </summary>
            <ul className="pb-2">
              {m.lessons.map((l) => {
                const locked = !enrolled && !l.is_free_preview;
                const isDone = completed.has(l.id);
                const current = l.id === currentId;
                const TypeIcon = l.type === "text" ? FileText : l.type === "live" ? Radio : PlayCircle;
                const StateIcon = isDone ? CheckCircle2 : locked ? Lock : Circle;
                return (
                  <li key={l.id}>
                    <Link
                      href={`?lesson=${l.id}`}
                      aria-current={current ? "page" : undefined}
                      className={cn("flex items-start gap-3 border-l-2 px-4 py-2.5 text-sm", current ? "border-primary bg-primary-soft" : "border-transparent hover:bg-surface")}
                    >
                      <StateIcon className={cn("mt-0.5 h-4 w-4 shrink-0", isDone ? "text-success" : "text-subtle-foreground")} aria-label={isDone ? "Completed" : locked ? "Locked" : "Not completed"} />
                      <span className="min-w-0 flex-1">
                        <span className={cn("block", current && "font-medium text-primary")}>{l.title}</span>
                        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-subtle-foreground">
                          <TypeIcon className="h-3 w-3" aria-hidden />
                          {l.duration_seconds ? formatDuration(l.duration_seconds) : l.type}
                          {l.is_free_preview && !enrolled ? <span className="font-medium text-primary">· Preview</span> : null}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

export default async function LearnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { slug } = await params;
  const { lesson: lessonId } = await searchParams;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getUser();
  const enrolled = await isEnrolled(user?.id ?? null, course.id);

  // Server decides access: enrolled → full curriculum with media. Otherwise → public outline only.
  const { modules, completed } = enrolled
    ? await getPlayerCurriculum(course.id, user?.id ?? null)
    : { modules: await getCurriculum(course.id), completed: new Set<string>() };
  const lessons = modules.flatMap((m) => m.lessons);
  const current = lessons.find((l) => l.id === lessonId) ?? (enrolled ? lessons.find((l) => !completed.has(l.id)) : lessons.find((l) => l.is_free_preview)) ?? lessons[0];
  const idx = current ? lessons.indexOf(current) : -1;
  const moduleOf = current ? modules.find((m) => m.id === current.module_id) : undefined;
  const canPlay = !!current && (enrolled || current.is_free_preview);
  // TODO(antigravity, Phase 3): for non-enrolled free previews, fetch that single lesson's video_url server-side.
  const source = canPlay ? toPlayerSource(current.video_url) : null;
  const pct = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;
  const isDone = current ? completed.has(current.id) : false;
  const list = <LessonList modules={modules} currentId={current?.id} completed={completed} enrolled={enrolled} />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background px-4">
        <Logo className="hidden sm:inline-flex" />
        <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
        <CourseNavDrawer label={course.title}>
          {enrolled ? <div className="border-b border-border p-4"><p className="mb-2 text-xs text-muted-foreground">{pct}% complete · {completed.size}/{lessons.length} lessons</p><ProgressBar value={pct} size="sm" /></div> : null}
          {list}
        </CourseNavDrawer>
        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{course.title}</p>
        {enrolled ? (
          <div className="hidden w-40 items-center gap-2 md:flex">
            <ProgressBar value={pct} size="sm" className="flex-1" label="Course progress" />
            <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
          </div>
        ) : (
          <ButtonLink href={`/courses/${slug}`} size="sm">Enroll</ButtonLink>
        )}
        <Link href={enrolled ? "/dashboard" : `/courses/${slug}`} aria-label="Exit course" className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2"><X className="h-4 w-4" /></Link>
      </header>

      <div className="grid flex-1 lg:grid-cols-[320px_1fr]">
        {/* Desktop lesson navigation */}
        <aside aria-label="Course content" className="hidden border-r border-border lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
            <div className="border-b border-border p-4">
              <p className="text-sm font-semibold">Course content</p>
              {enrolled ? <><ProgressBar value={pct} size="sm" className="mt-3" label="Course progress" /><p className="mt-2 text-xs text-muted-foreground">{completed.size} of {lessons.length} lessons complete</p></> : <p className="mt-1 text-xs text-muted-foreground">Preview lessons are free. Enroll to unlock everything.</p>}
            </div>
            {list}
          </div>
        </aside>

        <main id="main" className="min-w-0">
          {!current ? (
            <div className="p-6"><EmptyState title="No lessons yet" description="This course's lessons haven't been published yet." /></div>
          ) : (
            <>
              <div className="bg-foreground">
                <div className="mx-auto aspect-video max-h-[70vh] w-full max-w-6xl">
                  {source?.kind === "iframe" ? (
                    <iframe src={source.src} title={current.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                  ) : source?.kind === "file" ? (
                    <video src={source.src} controls className="h-full w-full" />
                  ) : (
                    <div className="grid h-full place-items-center p-6 text-center text-white">
                      <div>
                        <Lock className="mx-auto h-8 w-8 opacity-70" aria-hidden />
                        <p className="mt-3 font-semibold">{canPlay ? "Video not available yet" : "This lesson is locked"}</p>
                        <p className="mt-1 text-sm opacity-70">{canPlay ? "Check back soon or contact support." : "Enroll in the course to watch every lesson."}</p>
                        {!canPlay ? <Link href={`/courses/${slug}`} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold hover:bg-primary-hover">View enrollment options</Link> : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{moduleOf ? `${moduleOf.title} · ` : ""}Lesson {idx + 1} of {lessons.length}</p>
                    <h1 className="mt-1 text-xl font-bold sm:text-2xl">{current.title}</h1>
                    {current.duration_seconds ? <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock className="h-4 w-4" aria-hidden />{formatDuration(current.duration_seconds)}</p> : null}
                  </div>
                  {enrolled ? (
                    <form action={toggleComplete.bind(null, current.id, slug, isDone)}>
                      <button className={buttonClass({ variant: isDone ? "outline" : "primary" }, isDone ? "text-success" : undefined)}>
                        <CheckCircle2 className="h-4 w-4" aria-hidden />{isDone ? "Completed" : "Mark as complete"}
                      </button>
                    </form>
                  ) : null}
                </div>

                <Tabs
                  className="mt-6"
                  tabs={[
                    {
                      id: "overview",
                      label: "Overview",
                      content: current.content_text ? (
                        <div className="text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{current.content_text}</div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No written notes for this lesson.</p>
                      ),
                    },
                    // TODO(antigravity, Phase 3/5): Notes (lesson_notes), Resources, Q&A tabs.
                    { id: "notes", label: "Notes", content: <EmptyState title="Personal notes are coming soon" description="You'll be able to save notes for each lesson." /> },
                    { id: "resources", label: "Resources", content: <EmptyState title="No resources for this lesson" /> },
                  ]}
                />

                <nav aria-label="Lesson navigation" className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
                  {idx > 0 ? <ButtonLink href={`?lesson=${lessons[idx - 1].id}`} variant="outline"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</ButtonLink> : <span />}
                  {idx < lessons.length - 1 ? <ButtonLink href={`?lesson=${lessons[idx + 1].id}`}>Next lesson<ChevronRight className="h-4 w-4" aria-hidden /></ButtonLink> : null}
                </nav>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
