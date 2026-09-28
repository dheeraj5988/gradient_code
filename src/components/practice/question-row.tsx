import Link from "next/link";
import type { QuestionWithState } from "@/lib/data/learning";
import { DifficultyBadge, StateIcon, TYPE_LABEL } from "./bits";
import { SaveQuestionButton } from "./save-button";

export function QuestionRow({ slug, q, index, meta }: { slug: string; q: QuestionWithState; index?: number; meta?: string }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3 hover:bg-surface sm:px-5">
      <StateIcon s={q.state} />
      <div className="min-w-0 flex-1">
        <Link href={`/learn/${slug}/practice/${q.id}`} className="block truncate text-sm font-medium hover:text-primary">
          {index != null ? <span className="text-subtle-foreground">{index}. </span> : null}{q.title}
        </Link>
        <p className="truncate text-xs text-muted-foreground">{meta ?? TYPE_LABEL[q.type]}</p>
      </div>
      <DifficultyBadge d={q.difficulty} className="hidden sm:inline-flex" />
      <SaveQuestionButton slug={slug} questionId={q.id} saved={q.saved} />
      <Link href={`/learn/${slug}/practice/${q.id}`} className="hidden h-8 items-center rounded-md border border-border-strong px-3 text-xs font-semibold hover:bg-background md:inline-flex">
        {q.state === "correct" ? "Review" : q.state === "not_started" ? "Solve" : "Retry"}
      </Link>
    </li>
  );
}
