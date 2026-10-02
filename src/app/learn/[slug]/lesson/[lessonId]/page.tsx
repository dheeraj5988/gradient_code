import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, Clock, Lock, Radio } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { VideoPlayer } from "@/components/learn/video-player";
import { CompleteButton } from "@/components/learn/complete-button";
import { NotesManager } from "@/components/learn/notes-panel";
import { ResourceCard } from "@/components/resources/resource-card";
import { getLearningContext, getLessonContent, getLessonExtras, getNotes, getResources, getVideoPosition, resourceHref } from "@/lib/data/learning";
import { formatDuration } from "@/lib/utils";
import { toPlayerSource, type PlayerSource } from "@/lib/video";
import { isDriveConfigured } from "@/lib/google-drive/client";

/** `?t=` from a note link: one non-negative whole number of seconds, capped at 24h; anything else is ignored. */
function parseStartAt(t: string | string[] | undefined): number | undefined {
  if (typeof t !== "string" || !/^\d{1,9}$/.test(t)) return undefined;
  return Math.min(Number(t), 86_400);
}

export default async function LessonPage({ params, searchParams }: { params: Promise<{ slug: string; lessonId: string }>; searchParams: Promise<{ t?: string | string[] }> }) {
  const { slug, lessonId } = await params;
  const startAt = parseStartAt((await searchParams).t);
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
  const isDrive = !!content && (content.has_drive_file || !!(content.video_url && /drive\.google\.com/.test(content.video_url)));

  let source: PlayerSource = null;
  if (content) {
    if (isDrive) {
      if (isDriveConfigured()) {
        source = { kind: "file", src: `/api/video/${lesson.id}` };
      } else if (!enrolled && lesson.is_free_preview && content.video_url) {
        // Free preview fallback where authorized
        source = toPlayerSource(content.video_url);
      } else {
        // Protected/paid lesson with unconfigured server streaming:
        // Do NOT expose public Drive preview iframe or new-tab link. Show clean unavailable state.
        source = {
          kind: "unavailable",
          message: "Video playback is temporarily unavailable. Please try again later.",
        };
      }
    } else {
      source = toPlayerSource(content.video_url);
    }
  }

  const [position, notes, resources, extras] = await Promise.all([
    enrolled ? getVideoPosition(ctx.userId, lesson.id) : 0,
    enrolled ? getNotes(ctx.userId, ctx.course.id, { lessonId: lesson.id }) : [],
    enrolled ? getResources(ctx.course.id) : [],
    content ? getLessonExtras(lesson.id) : { description: null, captions: [] },
  ]);
  // Subtitle tracks only work in the native player (authorised /api/video stream), not in embeds.
  const captions = source?.kind === "file" ? extras.captions.map((c) => ({ src: `/api/caption/${c.id}`, srcLang: c.language, label: c.label, default: c.is_default })) : [];
  const lessonResources = resources.filter((r) => r.lesson_id === lesson.id || (!r.lesson_id && r.module_id === lesson.module_id));
  const hrefs = await Promise.all(lessonResources.map(resourceHref));

  return (
    <div className="pb-8">
      <div className="bg-media">
        {/* The player owns the 16:9 ratio; fallback states below may grow to fit their text. */}
        <div className="mx-auto w-full max-w-6xl">
          {content === null ? (
            <div className="grid min-h-48 place-items-center px-4 py-6 text-center text-on-media sm:min-h-64">
              <div>
                <Lock className="mx-auto h-8 w-8 opacity-70" aria-hidden />
                <p className="mt-3 font-semibold">This lesson is part of the full course</p>
                <p className="mt-1 text-sm opacity-70">Enroll to watch every lesson.</p>
                <Link href={`/courses/${slug}`} className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-hover">View enrollment options</Link>
              </div>
            </div>
          ) : source ? (
            <VideoPlayer key={lesson.id} source={source} lessonId={lesson.id} title={lesson.title} initialPosition={position} track={enrolled} courseHref={base} captions={captions} startAt={startAt} />
          ) : lesson.type === "live" && content.join_url ? (
            <div className="grid min-h-48 place-items-center px-4 py-6 text-center text-on-media sm:min-h-64">
              <div>
                <Radio className="mx-auto h-8 w-8" aria-hidden />
                <p className="mt-3 font-semibold">Live session</p>
                <a href={content.join_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">Join session</a>
              </div>
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center px-4 py-6 text-center text-on-media sm:min-h-64 text-on-media/80">
              <p className="text-sm">{lesson.type === "text" ? "This is a reading lesson — see the content below." : "The video for this lesson hasn't been uploaded yet."}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        <Breadcrumbs items={[{ label: ctx.course.title, href: base }, { label: mod?.title ?? "Module" }, { label: `Lesson ${idx + 1}` }]} />
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold break-words sm:text-2xl">{lesson.title}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
              <span>Lesson {idx + 1} of {ctx.lessons.length}</span>
              {lesson.duration_seconds ? <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4" aria-hidden />{formatDuration(lesson.duration_seconds)}</span> : null}
              {!enrolled && lesson.is_free_preview ? <span className="font-medium text-primary">Free preview</span> : null}
            </p>
          </div>
          {enrolled ? <CompleteButton slug={slug} lessonId={lesson.id} done={done} nextHref={next ? `${base}/lesson/${next.id}` : undefined} className="hidden lg:block" /> : null}
        </div>

        {/* Phones/tablets: actions sit in the flow right under the title (no fixed bar over notes/keyboard). */}
        <nav aria-label="Lesson actions" className="mt-4 grid grid-cols-[44px_minmax(0,1fr)_44px] items-start gap-2 rounded-xl border border-border bg-card p-2 lg:hidden">
          <ButtonLink href={prev ? `${base}/lesson/${prev.id}` : base} variant="outline" aria-label={prev ? "Previous lesson" : "Back to overview"} className="h-11 w-11 px-0"><ChevronLeft className="h-4 w-4" aria-hidden /></ButtonLink>
          <div className="min-w-0">
            {enrolled ? <CompleteButton slug={slug} lessonId={lesson.id} done={done} nextHref={next ? `${base}/lesson/${next.id}` : undefined} compact className="[&>button]:min-h-11 [&>button]:w-full [&>button]:whitespace-normal" /> : <ButtonLink href={`/courses/${slug}`} className="min-h-11 w-full">Enroll</ButtonLink>}
          </div>
          <ButtonLink href={next ? `${base}/lesson/${next.id}` : base} variant="outline" aria-label={next ? "Next lesson" : "Back to overview"} className="h-11 w-11 px-0"><ChevronRight className="h-4 w-4" aria-hidden /></ButtonLink>
        </nav>

        <div className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
          <Tabs
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: extras.description || content?.content_text ? (
                  <div className="space-y-4">
                    {extras.description ? <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{extras.description}</p> : null}
                    {content?.content_text ? <div className="text-[15px] leading-relaxed whitespace-pre-line">{content.content_text}</div> : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{mod ? `Part of “${mod.title}”.` : ""} No written material for this lesson.</p>
                ),
              },
              {
                id: "notes",
                label: `Notes${notes.length ? ` (${notes.length})` : ""}`,
                content: enrolled ? (
                  <div className="space-y-4">
                    <NotesManager slug={slug} courseId={ctx.course.id} lessonId={lesson.id} allowTimestamp={!!source} canSeek={source?.kind === "file" || (source?.kind === "iframe" && source.src.includes("youtube.com/embed/"))} initial={notes} emptyText="No notes for this lesson yet." />
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

    </div>
  );
}
