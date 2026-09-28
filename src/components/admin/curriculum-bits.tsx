"use client";
import { useActionState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, Trash2 } from "lucide-react";
import type { ActionResult } from "@/lib/admin/guard";
import { cn } from "@/lib/utils";

type A = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;

/** Tiny icon-button form (move/toggle/delete) with confirm + inline error. */
export function IconAction({ action, hidden, label, icon, confirm: confirmText, tone }: { action: A; hidden: Record<string, string>; label: string; icon: "up" | "down" | "eye" | "eyeOff" | "trash"; confirm?: string; tone?: "danger" }) {
  const [state, formAction, pending] = useActionState(action, null);
  const Icon = { up: ArrowUp, down: ArrowDown, eye: Eye, eyeOff: EyeOff, trash: Trash2 }[icon];
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
