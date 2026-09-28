import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  default: "bg-surface-2 text-muted-foreground",
  brand: "bg-brand-purple/15 text-brand-pink",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
} as const;

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: keyof typeof tones; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
