"use client";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Gift, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/admin/guard";
import { cn } from "@/lib/utils";

type A = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

/** Tiny icon-button form (move/toggle/delete) with confirm + inline error. */
export function IconAction({ action, hidden, label, icon, confirm: confirmText, tone }: { action: A; hidden: Record<string, string>; label: string; icon: "up" | "down" | "eye" | "eyeOff" | "trash" | "preview"; confirm?: string; tone?: "danger" }) {
  const [state, formAction, pending] = useActionState(action, null);
  const Icon = { up: ArrowUp, down: ArrowDown, eye: Eye, eyeOff: EyeOff, trash: Trash2, preview: Gift }[icon];
  return (
    <form action={formAction} onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }} className="relative inline-flex">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button disabled={pending} aria-label={label} title={label} className={cn("grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground disabled:opacity-40", tone === "danger" && "hover:bg-danger-soft hover:text-danger")}>
        <Icon className="h-3.5 w-3.5" />
      </button>
      {state && !state.ok ? <span role="alert" className="absolute top-8 right-0 z-10 w-64 rounded-md border border-danger/25 bg-danger-soft p-2 text-xs text-danger shadow-card">{state.error}</span> : null}
    </form>
  );
}

/** Inline single-line form (add module / add lesson / rename). */
export function InlineForm({ action, placeholder, submit, withType, defaultValue }: { action: A; placeholder: string; submit: string; withType?: boolean; defaultValue?: string }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-1" key={state?.ok ? Math.random() : "f"}>
      <div className="flex flex-wrap gap-2">
        <label className="sr-only" htmlFor={`in-${placeholder}`}>{placeholder}</label>
        <input id={`in-${placeholder}`} name="title" required minLength={2} maxLength={200} defaultValue={defaultValue} placeholder={placeholder} className="h-9 min-w-48 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
        {withType ? (
          <select name="type" aria-label="Lesson type" className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
            <option value="video">Video</option><option value="text">Reading</option><option value="live">Live</option>
          </select>
        ) : null}
        <button disabled={pending} className="h-9 rounded-lg border border-border-strong bg-background px-3 text-sm font-medium hover:bg-surface disabled:opacity-50">{pending ? "Saving…" : submit}</button>
      </div>
      {state && !state.ok ? <p role="alert" className="text-xs text-danger">{state.error}</p> : null}
      {state?.ok && state.message ? <p role="status" className="text-xs text-success">{state.message}</p> : null}
    </form>
  );
}

/** "Free preview: first N lessons" control for the curriculum header. */
export function PreviewFirstForm({ action, courseId, current }: { action: A; courseId: string; current: number }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-2 text-sm">
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="op" value="preview_first" />
      <label htmlFor="preview-count" className="font-medium">Free preview</label>
      <select id="preview-count" name="count" defaultValue={String(Math.min(current, 5))} className="h-9 rounded-lg border border-input bg-background px-2 text-sm">
        <option value="0">Off</option>
        {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>First {n} lesson{n > 1 ? "s" : ""}</option>)}
      </select>
      <button disabled={pending} className="h-9 rounded-lg border border-border-strong bg-background px-3 font-medium hover:bg-surface disabled:opacity-50">{pending ? "Saving…" : "Apply"}</button>
      {state && !state.ok ? <span role="alert" className="text-xs text-danger">{state.error}</span> : null}
      {state?.ok && state.message ? <span role="status" className="text-xs text-success">{state.message}</span> : null}
    </form>
  );
}
