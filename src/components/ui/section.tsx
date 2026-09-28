import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function SectionHeader({ title, description, action, className, as: H = "h2" }: {
  title: ReactNode; description?: ReactNode; action?: ReactNode; className?: string; as?: "h1" | "h2" | "h3";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl">
        <H className={cn("font-bold text-foreground", H === "h1" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-[28px]")}>{title}</H>
        {description ? <p className="mt-2 text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
