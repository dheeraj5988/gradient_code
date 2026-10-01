"use client";
import { useRef, useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { Button } from "@/components/ui/button";

/**
 * Phone/tablet filter sheet for /courses. The filter links are rendered on the server and passed in
 * as children; following one updates the URL (same as desktop) and closes the sheet.
 */
export function CatalogFilterSheet({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <div className="mb-4 lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="catalog-filters"
        onClick={() => setOpen(true)}
        className="flex min-h-11 w-full items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:bg-surface"
      >
        <SlidersHorizontal className="h-4 w-4" aria-hidden />
        Filters
        {count ? <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{count}</span> : null}
      </button>
      <MobileSheet
        id="catalog-filters"
        open={open}
        onClose={() => setOpen(false)}
        title="Filters"
        side="bottom"
        desktopMin={1024}
        returnFocusRef={triggerRef}
        footer={<Button type="button" className="w-full" onClick={() => setOpen(false)}>Done</Button>}
      >
        {children}
      </MobileSheet>
    </div>
  );
}
