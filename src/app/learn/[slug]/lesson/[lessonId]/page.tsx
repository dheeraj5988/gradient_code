import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Lock, Radio } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { VideoPlayer } from "@/components/learn/video-player";
import { CompleteButton } from "@/components/learn/complete-button";
import { NewNoteForm, NoteItem } from "@/components/learn/notes-panel";
import { ResourceCard } from "@/components/resources/resource-card";
import { getLearningContext, getLessonContent, getNotes, getResources, getVideoPosition, resourceHref } from "@/lib/data/learning";
import { formatDuration } from "@/lib/utils";
import { toPlayerSource } from "@/lib/video";

export default async function LessonPage({ params }: { params: Promise<{ slug: string; lessonId: string }> }) {
  const { slug, lessonId } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const lesson = ctx.lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();
  const enrolled = ctx.access === "enrolled";
  const idx = ctx.lessons.indexOf(lesson);
  const prev = ctx.lessons[idx - 1];
  const next = ctx.lessons[idx + 1];
  const mod = ctx.modules.find((m) => m.id === lesson.module_id);
  const done = ctx.completed.has(lesson.id);
  const base = `/learn/${slug}`;

  // The DATABASE decides whether content is returned (enrolled / admin / free preview).
  const content = enrolled || lesson.is_free_preview ? await getLessonContent(lesson.id) : null;
  const source = content ? toPlayerSource(content.video_url) : null;
  const [position, notes, resources] = enrolled
    ? await Promise.all([getVideoPosition(ctx.userId, lesson.id), getNotes(ctx.userId, ctx.course.id, { lessonId: lesson.id }), getResources(ctx.course.id)])
    : [0, [], []];
  const lessonResources = resources.filter((r) => r.lesson_id === lesson.id || (!r.lesson_id && r.module_id === lesson.module_id));
  const hrefs = await Promise.all(lessonResources.map(resourceHref));

  return (
    <div className="pb-24 lg:pb-8">
      <div className="bg-foreground">
        <div className="mx-auto aspect-video max-h-[68vh] w-full max-w-6xl">
          {content === null ? (
            <div className="grid h-full place-items-center p-6 text-center text-white">
              <div>
                <Lock className="mx-auto h-8 w-8 opacity-70" aria-hidden />
                <p className="mt-3 font-semibold">This lesson is part of the full course</p>
                <p className="mt-1 text-sm opacity-70">Enroll to watch every lesson.</p>
                <Link href={`/courses/${slug}`} className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold hover:bg-primary-hover">View enrollment options</Link>
              </div>
            </div>
          ) : source ? (
            <VideoPlayer key={lesson.id} source={source} lessonId={lesson.id} title={lesson.title} initialPosition={position} track={enrolled} />
          ) : lesson.type === "live" && content.join_url ? (
            <div className="grid h-full place-items-center p-6 text-center text-white">
              <div>
                <Radio className="mx-auto h-8 w-8" aria-hidden />
                <p className="mt-3 font-semibold">Live session</p>
                <a href={content.join_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-semibold">Join session</a>
              </div>
            </div>
          ) : (
            <div className="grid h-full place-items-center p-6 text-center text-white/80">
              <p className="text-sm">{lesson.type === "text" ? "This is a reading lesson — see the content below." : "The video for this lesson hasn't been uploaded yet."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Breadcrumbs items={[{ label: ctx.course.title, href: base }, { label: mod?.title ?? "Module" }, { label: `Lesson ${idx + 1}` }]} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">{lesson.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>Lesson {idx + 1} of {ctx.lessons.length}</span>
              {lesson.duration_seconds ? <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{formatDuration(lesson.duration_seconds)}</span> : null}
              {!enrolled && lesson.is_free_preview ? <span className="font-medium text-primary">Free preview</span> : null}
            </p>
          </div>
          {enrolled ? <CompleteButton slug={slug} lessonId={lesson.id} done={done} nextHref={next ? `${base}/lesson/${next.id}` : undefined} className="hidden lg:block" /> : null}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <Tabs
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: content?.content_text ? (
                  <div className="text-[15px] leading-relaxed whitespace-pre-line">{content.content_text}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">{mod ? `Part of “${mod.title}”.` : ""} No written material for this lesson.</p>
                ),
              },
              {
                id: "notes",
                label: `Notes${notes.length ? ` (${notes.length})` : ""}`,
                content: enrolled ? (
                  <div className="space-y-4">
                    <NewNoteForm slug={slug} courseId={ctx.course.id} lessonId={lesson.id} allowTimestamp={!!source} />
                    {notes.length ? <ul className="space-y-3">{notes.map((n) => <NoteItem key={n.id} slug={slug} note={n} />)}</ul> : <p className="text-sm text-muted-foreground">No notes for this lesson yet.</p>}
                  </div>
                ) : <p className="text-sm text-muted-foreground">Enroll to take notes.</p>,
              },
              {
                id: "resources",
                label: `Resources${lessonResources.length ? ` (${lessonResources.length})` : ""}`,
                content: lessonResources.length ? (
                  <div className="space-y-3">{lessonResources.map((r, i) => <ResourceCard key={r.id} r={r} href={hrefs[i]} />)}</div>
                ) : <EmptyState title="No resources for this lesson" description="Course-wide material is on the Resources page." action={<ButtonLink href={`${base}/resources`} variant="outline" size="sm">All resources</ButtonLink>} />,
              },
            ]}
          />
        </div>

        <nav aria-label="Lesson navigation" className="mt-6 hidden items-center justify-between gap-3 lg:flex">
          {prev ? <ButtonLink href={`${base}/lesson/${prev.id}`} variant="outline"><ChevronLeft className="h-4 w-4" aria-hidden />Previous</ButtonLink> : <span />}
          {next ? <ButtonLink href={`${base}/lesson/${next.id}`}>Next lesson<ChevronRight className="h-4 w-4" aria-hidden /></ButtonLink> : <ButtonLink href={base} variant="outline">Back to overview</ButtonLink>}
        </nav>
      </div>

      {/* Mobile / tablet action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-2">
          <ButtonLink href={prev ? `${base}/lesson/${prev.id}` : base} variant="outline" size="sm" aria-label="Previous lesson" className="w-10 px-0"><ChevronLeft className="h-4 w-4" /></ButtonLink>
          <div className="flex-1">
            {enrolled ? <CompleteButton slug={slug} lessonId={lesson.id} done={done} nextHref={next ? `${base}/lesson/${next.id}` : undefined} compact className="[&>button]:w-full" /> : <ButtonLink href={`/courses/${slug}`} size="sm" className="w-full">Enroll</ButtonLink>}
          </div>
          <ButtonLink href={next ? `${base}/lesson/${next.id}` : base} variant="outline" size="sm" aria-label="Next lesson" className="w-10 px-0"><ChevronRight className="h-4 w-4" /></ButtonLink>
        </div>
      </div>
    </div>
  );
}
