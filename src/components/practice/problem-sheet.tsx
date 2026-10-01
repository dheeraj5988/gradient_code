"use client";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { setProblemSolved } from "@/app/learn/[slug]/actions";
import type { CodingProblem } from "@/lib/data/learning";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PLATFORM: Record<string, string> = { leetcode: "LeetCode", hackerrank: "HackerRank", geeksforgeeks: "GeeksforGeeks", codeforces: "Codeforces", other: "the site" };
const DIFF_TONE: Record<string, string> = { easy: "text-success", medium: "text-warning", hard: "text-danger" };
type Filter = "all" | "todo" | "done";

/** Sheet of external problems grouped by module, with optimistic tick-to-track progress. */
export function ProblemSheet({ problems, sections }: { problems: CodingProblem[]; sections: { id: string; title: string }[] }) {
  const [solved, setSolved] = useState(() => new Set(problems.filter((p) => p.solved).map((p) => p.id)));
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  const toggle = (id: string) => {
    const next = !solved.has(id);
    setSolved((s) => { const n = new Set(s); if (next) n.add(id); else n.delete(id); return n; });
    setError(null);
    start(async () => {
      const r = await setProblemSolved(id, next);
      if (!r.ok) {
        setError(r.error);
        setSolved((s) => { const n = new Set(s); if (next) n.delete(id); else n.add(id); return n; }); // roll back
      }
    });
  };

  const pct = problems.length ? (solved.size / problems.length) * 100 : 0;
  const groups = useMemo(() => sections.map((s) => ({ ...s, items: problems.filter((p) => (p.module_id ?? "course") === s.id) })).filter((g) => g.items.length), [problems, sections]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm font-semibold">{solved.size} of {problems.length} solved</p>
          <div role="group" aria-label="Filter problems" className="flex gap-1 text-xs">
            {(["all", "todo", "done"] as Filter[]).map((f) => (
              <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={cn("rounded-md px-2.5 py-1 font-medium", filter === f ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-2")}>
                {f === "all" ? "All" : f === "todo" ? "To do" : "Solved"}
              </button>
            ))}
          </div>
        </div>
        <ProgressBar value={pct} className="mt-3" tone={pct === 100 ? "success" : "primary"} label="Problems solved" />
        {error ? <p role="alert" className="mt-3 text-xs text-danger">{error}</p> : null}
      </div>

      {groups.map((g) => {
        const items = g.items.filter((p) => filter === "all" || (filter === "done") === solved.has(p.id));
        const done = g.items.filter((p) => solved.has(p.id)).length;
        return (
          <section key={g.id} className="rounded-xl border border-border bg-card">
            <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <h2 className="min-w-0 truncate text-sm font-semibold">{g.title}</h2>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{done}/{g.items.length}</span>
            </header>
            {items.length ? (
              <ul className="divide-y divide-border">
                {items.map((p) => {
                  const isDone = solved.has(p.id);
                  return (
                    <li key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                      <button type="button" role="checkbox" aria-checked={isDone} aria-label={`Mark “${p.title}” as ${isDone ? "not solved" : "solved"}`} onClick={() => toggle(p.id)}
                        className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary">
                        {isDone ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : <Circle className="h-5 w-5 text-subtle-foreground" aria-hidden />}
                      </button>
                      <span className={cn("min-w-0 flex-1 text-sm", isDone && "text-muted-foreground line-through")}>{p.title}</span>
                      {p.difficulty ? <span className={cn("hidden text-xs font-medium capitalize sm:inline", DIFF_TONE[p.difficulty])}>{p.difficulty}</span> : null}
                      <Badge className="hidden md:inline-flex">{PLATFORM[p.platform] ?? p.platform}</Badge>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary-soft">
                        Solve<span className="sr-only"> “{p.title}” on {PLATFORM[p.platform] ?? p.platform} (opens in a new tab)</span><ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    </li>
                  );
                })}
              </ul>
            ) : <p className="px-4 py-3 text-sm text-muted-foreground">{filter === "done" ? "Nothing solved here yet." : "All solved — nice work."}</p>}
          </section>
        );
      })}
    </div>
  );
}
