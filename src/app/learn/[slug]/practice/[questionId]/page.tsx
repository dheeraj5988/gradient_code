import { notFound } from "next/navigation";
import { Lightbulb } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { LockedState, PortalPage } from "@/components/learn/portal";
import { DifficultyBadge, TYPE_LABEL } from "@/components/practice/bits";
import { QuestionCard } from "@/components/practice/question-card";
import { SaveQuestionButton } from "@/components/practice/save-button";
import { getLastAnswer, getLearningContext, getPractice, getReview } from "@/lib/data/learning";
import type { SubmittedAnswer } from "../../actions";

export default async function QuestionPage({ params }: { params: Promise<{ slug: string; questionId: string }> }) {
  const { slug, questionId } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="Practice"><LockedState slug={slug} what="practice questions" /></PortalPage>;
  const data = await getPractice(ctx.course.id, ctx.userId);
  const idx = data.questions.findIndex((q) => q.id === questionId);
  if (idx < 0) notFound();
  const q = data.questions[idx];
  const attempted = q.state !== "not_started";
  const [review, last] = attempted ? await Promise.all([getReview(q.id), getLastAnswer(ctx.userId, q.id)]) : [null, null];
  const next = data.questions.slice(idx + 1).find((x) => x.state !== "correct") ?? data.questions[idx + 1];
  const topic = data.topics.find((t) => t.id === q.topic_id);
  const lesson = q.lesson_id ? ctx.lessons.find((l) => l.id === q.lesson_id) : null;
  const paragraphs = q.prompt.split(/\n{2,}/);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-8">
      <Breadcrumbs items={[{ label: "Practice", href: `/learn/${slug}/practice` }, ...(topic ? [{ label: topic.name }] : []), { label: `Question ${idx + 1}` }]} />
      <article className="mt-4 rounded-xl border border-border bg-card">
        <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-3 sm:px-6">
          <span className="text-sm font-semibold">Question {idx + 1} of {data.questions.length}</span>
          <DifficultyBadge d={q.difficulty} />
          <span className="text-xs text-muted-foreground">{TYPE_LABEL[q.type]} · {q.points} pts · ~{q.estimated_minutes} min</span>
          <span className="ml-auto"><SaveQuestionButton slug={slug} questionId={q.id} saved={q.saved} withLabel /></span>
        </header>
        <div className="space-y-5 px-4 py-5 sm:px-6">
          <div>
            <h1 className="text-xl font-bold">{q.title}</h1>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
              {paragraphs.map((p, i) =>
                i > 0 && ["output_prediction", "debugging", "coding"].includes(q.type) ? (
                  <pre key={i} className="overflow-x-auto rounded-lg border border-border bg-surface p-3 font-mono text-[13px]">{p}</pre>
                ) : <p key={i} className="whitespace-pre-wrap">{p}</p>,
              )}
            </div>
          </div>
          {q.hint && !attempted ? (
            <details className="rounded-lg border border-border bg-surface px-4 py-3 text-sm">
              <summary className="flex cursor-pointer items-center gap-2 font-medium"><Lightbulb className="h-4 w-4 text-warning" aria-hidden />Show hint</summary>
              <p className="mt-2 text-muted-foreground">{q.hint}</p>
            </details>
          ) : null}
          <QuestionCard
            slug={slug}
            q={q}
            state={q.state}
            review={review}
            lastAnswer={(last as SubmittedAnswer | null) ?? null}
            nextHref={next ? `/learn/${slug}/practice/${next.id}` : null}
            relatedLesson={lesson ? { href: `/learn/${slug}/lesson/${lesson.id}`, title: lesson.title } : null}
            topicName={topic?.name ?? null}
          />
        </div>
      </article>
    </div>
  );
}
