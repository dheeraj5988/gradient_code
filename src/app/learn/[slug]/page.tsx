import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Lock, PlayCircle } from "lucide-react";
import { Logo } from "@/components/brand";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { getCourseBySlug, getCurriculum, getPlayerCurriculum, isEnrolled } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { cn, formatDuration } from "@/lib/utils";
import { toPlayerSource } from "@/lib/video";
import { toggleComplete } from "./actions";

export const metadata = { title: "Learn" };

export default async function LearnPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lesson?: string }> }) {
  const { slug } = await params;
  const { lesson: lessonId } = await searchParams;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getUser();
  const enrolled = await isEnrolled(user?.id ?? null, course.id);

  // Enrolled → full curriculum with videos. Otherwise → public outline; only free previews playable.
  const { modules, completed } = enrolled
    ? await getPlayerCurriculum(course.id, user?.id ?? null)
    : { modules: await getCurriculum(course.id), completed: new Set<string>() };
  const lessons = modules.flatMap((m) => m.lessons);
  const current = lessons.find((l) => l.id === lessonId) ?? (enrolled ? lessons.find((l) => !completed.has(l.id)) : lessons.find((l) => l.is_free_preview)) ?? lessons[0];
  const idx = current ? lessons.indexOf(current) : -1;
  const canPlay = !!current && (enrolled || current.is_free_preview);
  // TODO(antigravity): for non-enrolled preview, fetch the single preview lesson's video_url server-side with the service role.
  const source = canPlay ? toPlayerSource(current.video_url) : null;
  const pct = lessons.length ? Math.round((completed.size / lessons.length) * 100) : 0;
  const isDone = current ? completed.has(current.id) : false;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center gap-4 border-b border-border bg-surface px-4">
        <Logo />
        <span className="hidden h-5 w-px bg-border sm:block" />
        <p className="hidden truncate text-sm font-medium sm:block">{course.title}</p>
        <div className="ml-auto flex items-center gap-3">
          {enrolled ? <span className="text-xs text-muted-foreground">{pct}% complete</span> : <ButtonLink href={`/courses/${slug}`} size="sm">Enroll to unlock</ButtonLink>}
          <Link href="/dashboard" className="text-xs text-muted-foreground hover:text-foreground">Exit</Link>
        </div>
      </header>

      <div className="grid flex-1 lg:grid-cols-[1fr_360px]">
        <section className="min-w-0">
          <div className="aspect-video w-full bg-black">
            {source?.kind === "iframe" ? (
              <iframe src={source.src} title={current!.title} className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
            ) : source?.kind === "file" ? (
              <video src={source.src} controls className="h-full w-full" />
            ) : (
              <div className="grid h-full place-items-center p-6 text-center">
                <div>
                  <Lock className="mx-auto h-10 w-10 text-muted-foreground" />
                  <p className="mt-3 font-medium">{canPlay ? "Video not available yet" : "Enroll to watch this lesson"}</p>
                </div>
              </div>
            )}
          </div>
          {current ? (
            <div className="space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Lesson {idx + 1} of {lessons.length}</p>
                  <h1 className="text-2xl font-bold">{current.title}</h1>
                </div>
                {enrolled ? (
                  <form action={toggleComplete.bind(null, current.id, slug, isDone)}>
                    <button className={buttonClass({ variant: isDone ? "secondary" : "primary", size: "sm" })}>
                      <CheckCircle2 className="h-4 w-4" />{isDone ? "Completed" : "Mark as complete"}
                    </button>
                  </form>
                ) : null}
              </div>
              {current.content_text ? <div className="whitespace-pre-line text-sm text-muted-foreground">{current.content_text}</div> : null}
              {/* TODO(antigravity): tabs — Overview / Notes (lesson_notes) / Resources / Q&A / Quiz (quiz_questions) */}
              <div className="flex justify-between border-t border-border pt-5">
                {idx > 0 ? <ButtonLink href={`?lesson=${lessons[idx - 1].id}`} variant="outline" size="sm"><ChevronLeft className="h-4 w-4" />Previous</ButtonLink> : <span />}
                {idx < lessons.length - 1 ? <ButtonLink href={`?lesson=${lessons[idx + 1].id}`} size="sm">Next<ChevronRight className="h-4 w-4" /></ButtonLink> : null}
              </div>
            </div>
          ) : null}
        </section>

        <aside className="border-l border-border bg-surface lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <div className="border-b border-border p-4">
            <p className="font-semibold">Course content</p>
            {enrolled ? <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2"><div className="gradient-fill h-full" style={{ width: `${pct}%` }} /></div> : null}
          </div>
          {modules.map((m, mi) => (
            <details key={m.id} open={m.lessons.some((l) => l.id === current?.id)} className="border-b border-border">
              <summary className="cursor-pointer px-4 py-3 text-sm font-medium hover:bg-surface-2">
                <span className="text-xs text-muted-foreground">Section {mi + 1}</span>
                <span className="block">{m.title}</span>
              </summary>
              <ul>
                {m.lessons.map((l) => {
                  const locked = !enrolled && !l.is_free_preview;
                  const Icon = completed.has(l.id) ? CheckCircle2 : locked ? Lock : l.id === current?.id ? PlayCircle : Circle;
                  return (
                    <li key={l.id}>
                      <Link href={`?lesson=${l.id}`} className={cn("flex items-start gap-3 px-4 py-2.5 text-sm hover:bg-surface-2", l.id === current?.id && "bg-surface-2")}>
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", completed.has(l.id) ? "text-success" : "text-muted-foreground")} />
                        <span className="flex-1">{l.title}</span>
                        {l.duration_seconds ? <span className="text-xs text-muted-foreground">{formatDuration(l.duration_seconds)}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
        </aside>
      </div>
    </div>
  );
}
