import { ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Native <details> accordion — keyboard accessible, no JS required. */
export function Accordion({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("divide-y divide-border overflow-hidden rounded-xl border border-border bg-card", className)}>{children}</div>;
}

export function AccordionItem({ title, meta, children, defaultOpen }: { title: ReactNode; meta?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="group" open={defaultOpen}>
      <summary className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 hover:bg-surface sm:px-5">
        <span className="flex min-w-0 items-center gap-2.5 font-medium">
          <ChevronDown className="h-4 w-4 shrink-0 text-subtle-foreground transition-transform group-open:rotate-180" aria-hidden />
          <span className="min-w-0">{title}</span>
        </span>
        {meta ? <span className="shrink-0 text-xs text-muted-foreground">{meta}</span> : null}
      </summary>
      <div className="border-t border-border">{children}</div>
    </details>
  );
}
