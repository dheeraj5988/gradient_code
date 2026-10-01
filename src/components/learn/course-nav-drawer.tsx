"use client";
import { ListVideo } from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";

/** Mobile/tablet drawer wrapping the server-rendered lesson list (native dialog via MobileSheet). */
export function CourseNavDrawer({ children, label }: { children: ReactNode; label: string }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls="lesson-menu" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium lg:hidden">
        <ListVideo className="h-4 w-4" aria-hidden /><span className="sr-only sm:not-sr-only">Lessons</span>
      </button>
      <MobileSheet id="lesson-menu" open={open} onClose={() => setOpen(false)} title={label} desktopMin={1024} returnFocusRef={triggerRef}>
        <div className="-mx-4 -my-4">{children}</div>
      </MobileSheet>
    </>
  );
}
