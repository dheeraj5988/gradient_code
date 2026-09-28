"use client";
import { ListVideo, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

/** Mobile/tablet drawer wrapping the server-rendered lesson list. */
export function CourseNavDrawer({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button onClick={() => setOpen(true)} aria-expanded={open} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium lg:hidden">
        <ListVideo className="h-4 w-4" aria-hidden />Lessons
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={label}>
          <button aria-label="Close lessons" className="absolute inset-0 bg-foreground/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-[88%] max-w-sm flex-col bg-background shadow-lg" onClick={(e) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); }}>
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <p className="text-sm font-semibold">{label}</p>
              <button autoFocus aria-label="Close lessons" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-2"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
