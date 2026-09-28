"use client";
import { useOptimistic, useTransition } from "react";
import { setReviewStatus } from "@/app/learn/[slug]/actions";
import { cn } from "@/lib/utils";

const OPTIONS = [["not_reviewed", "Not reviewed"], ["reviewed", "Reviewed"], ["confident", "Confident"]] as const;
type S = (typeof OPTIONS)[number][0];

export function ReviewToggle({ slug, questionId, status }: { slug: string; questionId: string; status: S }) {
  const [value, setValue] = useOptimistic(status);
  const [, start] = useTransition();
  return (
    <div role="radiogroup" aria-label="Review status" className="inline-flex rounded-lg border border-border bg-background p-0.5 text-xs">
      {OPTIONS.map(([v, label]) => (
        <button
          key={v}
          role="radio"
          aria-checked={value === v}
          onClick={() => start(async () => { setValue(v); await setReviewStatus(slug, questionId, v); })}
          className={cn("rounded-md px-2.5 py-1.5 font-medium", value === v ? (v === "confident" ? "bg-success-soft text-success" : v === "reviewed" ? "bg-primary-soft text-primary" : "bg-surface-2 text-foreground") : "text-muted-foreground hover:text-foreground")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
