"use client";
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { Button, type ButtonStyle } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import type { ActionResult } from "@/lib/admin/guard";
import { cn } from "@/lib/utils";

type FormAction = (prev: ActionResult<unknown> | null, form: FormData) => Promise<ActionResult<unknown>>;
const ErrorsCtx = createContext<Record<string, string>>({});

/**
 * Admin form: server action + validation errors + success/error banner +
 * unsaved-changes warning (beforeunload) + optional redirect on success.
 */
export function AdminForm({ action, children, className, redirectTo, resetOnSuccess }: { action: FormAction; children: ReactNode; className?: string; redirectTo?: (data: unknown) => string | null; resetOnSuccess?: boolean }) {
  const [state, formAction] = useActionState(action, null);
  const [dirty, setDirty] = useState(false);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state?.ok) {
      setDirty(false);
      if (resetOnSuccess) ref.current?.reset();
      const to = redirectTo?.(state.data);
      if (to) router.push(to);
    }
  }, [state, redirectTo, resetOnSuccess, router]);

  return (
    <ErrorsCtx.Provider value={(state && !state.ok && state.fieldErrors) || {}}>
      <form ref={ref} action={formAction} onChange={() => setDirty(true)} className={cn("space-y-5", className)} noValidate>
        {state ? (
          <div role={state.ok ? "status" : "alert"} className={cn("flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm", state.ok ? "border-success/25 bg-success-soft text-success" : "border-danger/25 bg-danger-soft text-danger")}>
            {state.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
            <span>{state.ok ? (state.message ?? "Saved.") : state.error}</span>
          </div>
        ) : null}
        {children}
        {dirty ? <p className="text-xs text-warning" aria-live="polite">You have unsaved changes.</p> : null}
      </form>
    </ErrorsCtx.Provider>
  );
}

export function SubmitButton({ children, pendingText = "Saving…", ...style }: { children: ReactNode; pendingText?: string } & ButtonStyle) {
  const { pending } = useFormStatus();
  return <Button type="submit" disabled={pending} {...style}>{pending ? pendingText : children}</Button>;
}

function useFieldError(name: string) {
  return useContext(ErrorsCtx)[name];
}

export function Field({ name, label, hint, required, children }: { name: string; label: string; hint?: string; required?: boolean; children: ReactNode }) {
  const err = useFieldError(name);
  return (
    <div>
      <label htmlFor={`f-${name}`} className="mb-1.5 block text-sm font-medium">{label}{required ? <span className="text-danger" aria-hidden> *</span> : null}</label>
      {children}
      {err ? <p id={`f-${name}-err`} className="mt-1 text-xs text-danger">{err}</p> : hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ name, label, hint, required, defaultValue, type = "text", placeholder, ...rest }: { name: string; label: string; hint?: string; required?: boolean; defaultValue?: string | number | null; type?: string; placeholder?: string; min?: number; step?: string; maxLength?: number }) {
  const err = useFieldError(name);
  return (
    <Field name={name} label={label} hint={hint} required={required}>
      <input id={`f-${name}`} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} aria-invalid={!!err} aria-describedby={err ? `f-${name}-err` : undefined} className={cn(fieldClass, err && "border-danger")} {...rest} />
    </Field>
  );
}

export function TextArea({ name, label, hint, required, defaultValue, rows = 4, mono, placeholder }: { name: string; label: string; hint?: string; required?: boolean; defaultValue?: string | null; rows?: number; mono?: boolean; placeholder?: string }) {
  const err = useFieldError(name);
  return (
    <Field name={name} label={label} hint={hint} required={required}>
      <textarea id={`f-${name}`} name={name} rows={rows} defaultValue={defaultValue ?? ""} placeholder={placeholder} aria-invalid={!!err} className={cn("w-full rounded-lg border border-input bg-background p-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20", mono && "font-mono text-[13px]", err && "border-danger")} />
    </Field>
  );
}

export function SelectInput({ name, label, hint, required, defaultValue, options, placeholder }: { name: string; label: string; hint?: string; required?: boolean; defaultValue?: string | null; options: [string, string][]; placeholder?: string }) {
  const err = useFieldError(name);
  return (
    <Field name={name} label={label} hint={hint} required={required}>
      <select id={`f-${name}`} name={name} defaultValue={defaultValue ?? ""} aria-invalid={!!err} className={cn(fieldClass, err && "border-danger")}>
        {placeholder !== undefined ? <option value="">{placeholder}</option> : null}
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </Field>
  );
}

export function Checkbox({ name, label, hint, defaultChecked }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-start gap-2.5 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" />
      <span><span className="font-medium">{label}</span>{hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}</span>
    </label>
  );
}

/** A one-button form for a server action, with optional confirmation and inline result. */
export function ActionButton({ action, children, confirm: confirmText, hidden = {}, ...style }: { action: FormAction; children: ReactNode; confirm?: string; hidden?: Record<string, string> } & ButtonStyle) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }} className="inline-flex flex-col items-start gap-1">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <SubmitButton pendingText="Working…" {...style}>{children}</SubmitButton>
      {state && !state.ok ? <span role="alert" className="max-w-xs text-xs text-danger">{state.error}</span> : null}
      {state?.ok && state.message ? <span role="status" className="text-xs text-success">{state.message}</span> : null}
    </form>
  );
}
