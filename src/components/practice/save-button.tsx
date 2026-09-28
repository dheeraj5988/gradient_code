"use client";
import { useOptimistic, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleSavedQuestion } from "@/app/learn/[slug]/actions";
import { cn } from "@/lib/utils";

export function SaveQuestionButton({ slug, questionId, saved, withLabel }: { slug: string; questionId: string; saved: boolean; withLabel?: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={optimistic}
      aria-label={optimistic ? "Remove from saved questions" : "Save question"}
      onClick={() => start(async () => { setOptimistic(!optimistic); await toggleSavedQuestion(slug, questionId, optimistic); })}
      className={cn("inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-sm hover:bg-surface-2", optimistic ? "text-primary" : "text-subtle-foreground")}
    >
      <Bookmark className={cn("h-4 w-4", optimistic && "fill-primary")} aria-hidden />
      {withLabel ? <span className="font-medium">{optimistic ? "Saved" : "Save"}</span> : null}
    </button>
  );
}
