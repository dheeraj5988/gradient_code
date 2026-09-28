"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { CheckCircle2, Clock3, RotateCcw, XCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { submitAnswer, type SubmittedAnswer } from "@/app/learn/[slug]/actions";
import type { AnswerKey, PracticeQuestion, QuestionState } from "@/lib/data/learning-types";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  q: PracticeQuestion;
  state: QuestionState;
  review: AnswerKey | null;          // only present if the learner already attempted (DB-enforced)
  lastAnswer: SubmittedAnswer | null;
  nextHref: string | null;
  relatedLesson: { href: string; title: string } | null;
  topicName: string | null;
};

const TF = ["True", "False"];

export function QuestionCard({ slug, q, state, review, lastAnswer, nextHref, relatedLesson, topicName }: Props) {
  const opts = q.type === "true_false" && !q.options.length ? TF : q.options;
  const multi = q.type === "multi_select";
  const choiceBased = ["mcq", "multi_select", "true_false"].includes(q.type);
  const code = ["coding", "debugging"].includes(q.type);

  const [choices, setChoices] = useState<number[]>(lastAnswer?.choices ?? []);
  const [text, setText] = useState(lastAnswer?.text ?? "");
  const [result, setResult] = useState<{ correct: boolean | null; key: AnswerKey } | null>(review ? { correct: state === "correct" ? true : state === "pending_review" ? null : false, key: review } : null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(Date.now());
  const locked = !!result;

  function toggle(i: number) {
    if (locked) return;
    setChoices((c) => (multi ? (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]) : [i]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const answer: SubmittedAnswer = choiceBased ? { choices } : { text };
    start(async () => {
      const r = await submitAnswer(slug, q.id, answer, (Date.now() - startedAt.current) / 1000);
      if (!r.ok) return setError(r.error);
      setError(null);
      setResult({ correct: r.data.is_correct, key: r.data });
    });
  }

  function retry() {
    setResult(null);
    setChoices([]);
    setText("");
    startedAt.current = Date.now();
  }

  const correctSet = new Set(result?.key.correct_options ?? []);

  return (
    <form onSubmit={submit} className="space-y-5">
      {choiceBased ? (
        <fieldset>
          <legend className="mb-3 text-sm font-semibold">{multi ? "Select all that apply" : "Choose one answer"}</legend>
          <div className="space-y-2" role={multi ? "group" : "radiogroup"}>
            {opts.map((o, i) => {
              const picked = choices.includes(i);
              const isRight = locked && correctSet.has(i);
              const isWrongPick = locked && picked && !correctSet.has(i);
              return (
                <label
                  key={i}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-sm transition-colors",
                    locked ? "cursor-default" : "hover:border-primary/40 hover:bg-primary-soft/40",
                    isRight ? "border-success/40 bg-success-soft" : isWrongPick ? "border-danger/40 bg-danger-soft" : picked ? "border-primary bg-primary-soft" : "border-border bg-background",
                  )}
                >
                  <input
                    type={multi ? "checkbox" : "radio"}
                    name={`q-${q.id}`}
                    checked={picked}
                    disabled={locked}
                    onChange={() => toggle(i)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--primary)]"
                  />
                  <span className={cn("flex-1", /[<>{}();=]/.test(o) && "font-mono text-[13px]")}>{o}</span>
                  {isRight ? <CheckCircle2 className="h-4 w-4 text-success" aria-label="Correct answer" /> : isWrongPick ? <XCircle className="h-4 w-4 text-danger" aria-label="Your incorrect choice" /> : null}
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : (
        <div>
          <label htmlFor={`ans-${q.id}`} className="mb-2 block text-sm font-semibold">
            {code ? "Your code" : q.type === "scenario" ? "Your answer" : q.type === "output_prediction" ? "Expected output" : "Your answer"}
          </label>
          {code || q.type === "scenario" ? (
            <textarea
              id={`ans-${q.id}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              readOnly={locked}
              rows={code ? 10 : 6}
              spellCheck={!code}
              className={cn("w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20", code && "font-mono text-[13px] leading-relaxed")}
              placeholder={code ? "// Write your solution here" : "Write your answer…"}
            />
          ) : (
            <input id={`ans-${q.id}`} value={text} onChange={(e) => setText(e.target.value)} readOnly={locked} autoComplete="off" className={cn("h-11 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20", q.type === "output_prediction" && "font-mono")} />
          )}
          {code ? <p className="mt-2 text-xs text-muted-foreground">Code execution is not available yet — your submission is saved and the reference solution is shown after you submit.</p> : null}
        </div>
      )}

      {error ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p> : null}

      {/* Result */}
      {result ? (
        <div role="status" className={cn("rounded-xl border p-4 sm:p-5", result.correct === true ? "border-success/30 bg-success-soft" : result.correct === false ? "border-danger/25 bg-danger-soft" : "border-warning/30 bg-warning-soft")}>
          <p className="flex items-center gap-2 font-semibold">
            {result.correct === true ? <><CheckCircle2 className="h-5 w-5 text-success" aria-hidden />Correct</> : result.correct === false ? <><XCircle className="h-5 w-5 text-danger" aria-hidden />Not quite</> : <><Clock3 className="h-5 w-5 text-warning" aria-hidden />Submitted</>}
          </p>
          {result.correct === false && result.key.accepted_answers.length ? <p className="mt-2 text-sm">Expected answer: <code className="rounded bg-background px-1.5 py-0.5 font-mono text-[13px]">{result.key.accepted_answers[0]}</code></p> : null}
          {result.key.explanation ? <p className="mt-2 text-sm text-foreground/85">{result.key.explanation}</p> : null}
          {result.key.solution ? (
            <details className="mt-3">
              <summary className="cursor-pointer text-sm font-medium text-primary">Reference solution</summary>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border bg-background p-3 font-mono text-[13px] leading-relaxed">{result.key.solution}</pre>
            </details>
          ) : null}
          {topicName || relatedLesson ? (
            <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {topicName ? <span>Topic: <strong className="text-foreground">{topicName}</strong></span> : null}
              {relatedLesson ? <span>Related lesson: <Link href={relatedLesson.href} className="font-medium text-primary hover:underline">{relatedLesson.title}</Link></span> : null}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-2 border-t border-border bg-card px-4 py-3 sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0">
        {!result ? (
          <Button disabled={pending || (choiceBased ? !choices.length : !text.trim())}>{pending ? "Checking…" : choiceBased || !["coding", "debugging", "scenario"].includes(q.type) ? "Check answer" : "Submit"}</Button>
        ) : (
          <Button type="button" variant="outline" onClick={retry}><RotateCcw className="h-4 w-4" aria-hidden />Try again</Button>
        )}
        {nextHref ? <ButtonLink href={nextHref} variant={result ? "primary" : "ghost"} className="ml-auto">Next question</ButtonLink> : null}
      </div>
    </form>
  );
}
