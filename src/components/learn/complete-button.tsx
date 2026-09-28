"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { toggleLessonComplete } from "@/app/learn/[slug]/actions";
import { cn } from "@/lib/utils";

export function CompleteButton({ slug, lessonId, done, nextHref, className, compact }: { slug: string; lessonId: string; done: boolean; nextHref?: string; className?: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className={className}>
      <button
        disabled={pending}
        aria-pressed={done}
        onClick={() =>
          start(async () => {
            const r = await toggleLessonComplete(slug, lessonId, done);
            if (!r.ok) return setError(r.error);
            setError(null);
            if (!done && nextHref) router.push(nextHref);
          })
        }
        className={buttonClass({ variant: done ? "outline" : "primary", size: compact ? "sm" : "md" }, cn("w-full sm:w-auto", done && "border-success/30 text-success"))}
      >
        {done ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <Circle className="h-4 w-4" aria-hidden />}
        {pending ? "Saving…" : done ? "Completed" : nextHref ? "Complete & continue" : "Mark as complete"}
      </button>
      {error ? <p role="alert" className="mt-1 text-xs text-danger">{error}</p> : null}
    </div>
  );
}
