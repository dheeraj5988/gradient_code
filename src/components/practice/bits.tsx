import { CheckCircle2, Circle, CircleDot, Clock3, XCircle } from "lucide-react";
import type { Difficulty, QuestionState, QuestionType } from "@/lib/data/learning-types";
import { cn } from "@/lib/utils";

const DIFF: Record<Difficulty, string> = {
  easy: "bg-success-soft text-success border-success/20",
  medium: "bg-warning-soft text-warning border-warning/25",
  hard: "bg-danger-soft text-danger border-danger/20",
};

export function DifficultyBadge({ d, className }: { d: Difficulty; className?: string }) {
  return <span className={cn("inline-flex rounded-md border px-1.5 py-px text-[11px] font-semibold capitalize", DIFF[d], className)}>{d}</span>;
}

export const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "Multiple choice",
  multi_select: "Multi-select",
  true_false: "True / False",
  short_answer: "Short answer",
  coding: "Coding",
  debugging: "Debugging",
  output_prediction: "Output prediction",
  scenario: "Scenario",
};

export function StateIcon({ s, className }: { s: QuestionState; className?: string }) {
  const map = {
    correct: { I: CheckCircle2, c: "text-success", l: "Solved" },
    incorrect: { I: XCircle, c: "text-danger", l: "Incorrect — try again" },
    pending_review: { I: Clock3, c: "text-warning", l: "Submitted for review" },
    attempted: { I: CircleDot, c: "text-warning", l: "Attempted" },
    not_started: { I: Circle, c: "text-border-strong", l: "Not started" },
  }[s];
  return <map.I className={cn("h-4 w-4 shrink-0", map.c, className)} aria-label={map.l} />;
}

export function DifficultyBars({ data }: { data: Record<Difficulty, { total: number; solved: number }> }) {
  const tone: Record<Difficulty, string> = { easy: "bg-success", medium: "bg-warning", hard: "bg-danger" };
  return (
    <ul className="space-y-3">
      {(["easy", "medium", "hard"] as const).filter((d) => data[d].total).map((d) => (
        <li key={d}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="capitalize">{d}</span>
            <span className="text-xs tabular-nums text-muted-foreground">{data[d].solved} / {data[d].total}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-label={`${d} questions solved`} aria-valuenow={data[d].solved} aria-valuemin={0} aria-valuemax={data[d].total}>
            <div className={cn("h-full rounded-full", tone[d])} style={{ width: `${(data[d].solved / data[d].total) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
