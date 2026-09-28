"use client";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label, fieldClass } from "@/components/ui/input";
import { savePlan } from "@/app/learn/[slug]/actions";

export function LearningPlanForm({ slug, courseId, initial }: { slug: string; courseId: string; initial: { target_date: string; hours_per_day: number } | null }) {
  const [state, action, pending] = useActionState(savePlan.bind(null, slug, courseId), null);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <Label htmlFor="target_date">Target completion date</Label>
        <input id="target_date" name="target_date" type="date" min={today} required defaultValue={initial?.target_date} className={fieldClass} />
      </div>
      <div>
        <Label htmlFor="hours_per_day">Hours per day</Label>
        <select id="hours_per_day" name="hours_per_day" defaultValue={String(initial?.hours_per_day ?? 1)} className={fieldClass}>
          {[0.5, 1, 1.5, 2, 3, 4, 6].map((h) => <option key={h} value={h}>{h} {h === 1 ? "hour" : "hours"}</option>)}
        </select>
      </div>
      <Button disabled={pending}>{pending ? "Saving…" : initial ? "Update plan" : "Create plan"}</Button>
      {state && !state.ok ? <p role="alert" className="text-sm text-danger sm:col-span-3">{state.error}</p> : null}
    </form>
  );
}
