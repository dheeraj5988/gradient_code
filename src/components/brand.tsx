import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Logo({ className, href = "/" }: { className?: string; href?: string }) {
  return (
    <Link href={href} className={cn("inline-flex items-center gap-2 font-display text-lg font-bold", className)}>
      <span className="gradient-text font-mono text-xl">{"</>"}</span>
      <span>
        <span className="gradient-text">Gradient</span> Code
      </span>
    </Link>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("gradient-border-static inline-flex items-center rounded-full bg-surface px-3.5 py-1.5 font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase", className)}>
      {children}
    </span>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, center = true, action }: {
  eyebrow?: string; title: ReactNode; subtitle?: string; center?: boolean; action?: ReactNode;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", center && "justify-center text-center")}>
      <div className={cn("max-w-2xl space-y-3", center && "mx-auto")}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <h2 className="text-3xl font-bold text-balance sm:text-4xl">{title}</h2>
        {subtitle ? <p className="text-muted-foreground text-pretty">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function Blobs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="blob -top-24 -left-20 h-80 w-80 bg-brand-indigo" />
      <div className="blob top-10 right-0 h-96 w-96 bg-brand-purple" />
      <div className="blob bottom-0 left-1/3 h-72 w-72 bg-brand-pink opacity-25" />
    </div>
  );
}
