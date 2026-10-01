import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Code2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ProgressRing } from "@/components/ui/progress-ring";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { LockedState, Panel, PortalPage } from "@/components/learn/portal";
import { DifficultyBars, StateIcon } from "@/components/practice/bits";
import { QuestionRow } from "@/components/practice/question-row";
import { getLearningContext, getPractice, type QuestionWithState } from "@/lib/data/learning";
import { cn } from "@/lib/utils";

const GROUPS = [["topic", "Topic"], ["day", "Day"], ["module", "Module"], ["difficulty", "Difficulty"]] as const;
const STATUS = [["all", "All"], ["unsolved", "Unsolved"], ["solved", "Solved"]] as const;

export default async function PracticePage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ group?: string; status?: string; difficulty?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="Practice"><LockedState slug={slug} what="practice questions" /></PortalPage>;

  const data = await getPractice(ctx.course.id, ctx.userId);
  const { stats } = data;
  if (!stats.total) {
    return (
      <PortalPage title="Practice" description="Course-specific questions to test what you've learned.">
        <EmptyState icon={Code2} title="No practice questions yet" description="Practice content will appear here when your instructor publishes it." />
      </PortalPage>
    );
  }

  const hasDays = data.questions.some((q) => q.day_number != null);
  const group = (GROUPS.find(([g]) => g === sp.group)?.[0]) ?? (hasDays ? "day" : "topic");
  let list = data.questions;
  if (sp.status === "solved") list = list.filter((q) => q.state === "correct");
  if (sp.status === "unsolved") list = list.filter((q) => q.state !== "correct");
  if (sp.difficulty && ["easy", "medium", "hard"].includes(sp.difficulty)) list = list.filter((q) => q.difficulty === sp.difficulty);

  const topicName = (id: string | null) => data.topics.find((t) => t.id === id)?.name ?? "General";
  const moduleName = (id: string | null) => ctx.modules.find((m) => m.id === id)?.title ?? "General";
  const keyOf = (q: QuestionWithState): [string, string] => {
    if (group === "day") return q.day_number != null ? [`d${String(q.day_number).padStart(3, "0")}`, `Day ${q.day_number} — ${topicName(q.topic_id)}`] : ["zzz", "Unscheduled"];
    if (group === "module") return [String(ctx.modules.findIndex((m) => m.id === q.module_id)).padStart(3, "0"), moduleName(q.module_id)];
    if (group === "difficulty") return [String(["easy", "medium", "hard"].indexOf(q.difficulty)), q.difficulty[0].toUpperCase() + q.difficulty.slice(1)];
    const t = data.topics.findIndex((x) => x.id === q.topic_id);
    return [t < 0 ? "zzz" : String(t).padStart(3, "0"), topicName(q.topic_id)];
  };
  const groups = new Map<string, { label: string; items: QuestionWithState[] }>();
  list.forEach((q) => {
    const [k, label] = keyOf(q);
    groups.set(k, { label, items: [...(groups.get(k)?.items ?? []), q] });
  });
  if (group === "day") {
    groups.forEach((g, k) => {
      if (k === "zzz") return;
      const names = [...new Set(g.items.map((q) => topicName(q.topic_id)))];
      g.label = `Day ${g.items[0].day_number} — ${names.join(", ")}`;
    });
  }
  const sorted = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
  const nextUp = data.questions.find((q) => q.state !== "correct");
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries({ group: sp.group, status: sp.status, difficulty: sp.difficulty, ...patch }).forEach(([k, v]) => v && v !== "all" && p.set(k, v));
    return p.size ? `?${p}` : "?";
  };

  return (
    <PortalPage
      title="Practice"
      description={`Questions for ${ctx.course.title}, grouped by ${group}.`}
      actions={nextUp ? <ButtonLink href={`/learn/${slug}/practice/${nextUp.id}`}>Continue practice <ArrowRight className="h-4 w-4" aria-hidden /></ButtonLink> : null}
    >
      <div className="grid gap-4 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel>
          <div className="flex items-center gap-4">
            <ProgressRing value={stats.percent} size={80} label={`${stats.percent}% of practice solved`} />
            <div>
              <p className="text-2xl font-bold tabular-nums">{stats.solved}<span className="text-base font-medium text-muted-foreground"> / {stats.total}</span></p>
              <p className="text-sm text-muted-foreground">solved</p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-center text-xs">
            <div><dt className="text-muted-foreground">Attempted</dt><dd className="text-sm font-semibold tabular-nums">{stats.attempted}</dd></div>
            <div><dt className="text-muted-foreground">Incorrect</dt><dd className="text-sm font-semibold tabular-nums">{stats.incorrect}</dd></div>
            <div><dt className="text-muted-foreground">Saved</dt><dd className="text-sm font-semibold tabular-nums">{stats.saved}</dd></div>
          </dl>
        </Panel>
        <Panel title="Difficulty"><DifficultyBars data={stats.byDifficulty} /></Panel>
        <Panel title="Topics">
          <ul className="space-y-3">
            {stats.byTopic.slice(0, 6).map((t) => (
              <li key={t.topic.id}>
                <div className="mb-1 flex justify-between text-sm"><span className="truncate">{t.topic.name}</span><span className="text-xs tabular-nums text-muted-foreground">{t.solved} / {t.total}</span></div>
                <ProgressBar value={(t.solved / t.total) * 100} size="sm" label={`${t.topic.name} progress`} />
              </li>
            ))}
            {!stats.byTopic.length ? <li className="text-sm text-muted-foreground">Questions aren&apos;t assigned to topics yet.</li> : null}
          </ul>
        </Panel>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card p-1 text-sm" role="group" aria-label="Group by">
          {GROUPS.filter(([g]) => g !== "day" || hasDays).map(([g, label]) => (
            <Link key={g} href={qs({ group: g })} aria-current={group === g ? "true" : undefined} className={cn("inline-flex min-h-11 items-center rounded-md px-3", group === g ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:text-foreground")}>{label}</Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm" role="group" aria-label="Filter">
          {STATUS.map(([s, label]) => (
            <Link key={s} href={qs({ status: s })} aria-current={(sp.status ?? "all") === s ? "true" : undefined} className={cn("inline-flex min-h-11 items-center rounded-md px-2.5", (sp.status ?? "all") === s ? "bg-surface-2 font-medium" : "text-muted-foreground hover:text-foreground")}>{label}</Link>
          ))}
          <span className="mx-1 h-4 w-px bg-border" aria-hidden />
          {(["easy", "medium", "hard"] as const).map((d) => (
            <Link key={d} href={qs({ difficulty: sp.difficulty === d ? undefined : d })} aria-current={sp.difficulty === d ? "true" : undefined} className={cn("inline-flex min-h-11 items-center rounded-md px-2.5 capitalize", sp.difficulty === d ? "bg-surface-2 font-medium" : "text-muted-foreground hover:text-foreground")}>{d}</Link>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {sorted.length ? (
          <Accordion>
            {sorted.map(([k, g], gi) => {
              const solved = g.items.filter((q) => q.state === "correct").length;
              return (
                <AccordionItem key={k} defaultOpen={gi === 0 || g.items.some((q) => q.state !== "correct" && q === nextUp)} title={g.label} meta={<span className="tabular-nums">{solved} / {g.items.length} completed</span>}>
                  <ul className="divide-y divide-border bg-background">
                    {g.items.map((q) => <QuestionRow key={q.id} slug={slug} q={q} meta={group === "topic" ? undefined : topicName(q.topic_id)} />)}
                  </ul>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : <EmptyState title="No questions match these filters" action={<ButtonLink href="?" variant="outline" size="sm">Clear filters</ButtonLink>} />}
      </div>

      {data.recent.length ? (
        <Panel title="Recent activity" className="mt-6">
          <ul className="divide-y divide-border">
            {data.recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                <StateIcon s={r.is_correct === true ? "correct" : r.is_correct === false ? "incorrect" : "pending_review"} />
                <Link href={`/learn/${slug}/practice/${r.question.id}`} className="min-w-0 flex-1 truncate hover:text-primary">{r.question.title}</Link>
                <time className="text-xs text-muted-foreground" dateTime={r.submitted_at}>{new Date(r.submitted_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</time>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}
    </PortalPage>
  );
}
