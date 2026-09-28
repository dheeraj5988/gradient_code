import { cn } from "@/lib/utils";

export function ProgressBar({ value, label, className, tone = "primary", size = "md" }: {
  value: number; label?: string; className?: string; tone?: "primary" | "success"; size?: "sm" | "md";
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={className}>
      <div
        role="progressbar"
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? "Progress"}
        className={cn("overflow-hidden rounded-full bg-surface-2", size === "sm" ? "h-1.5" : "h-2")}
      >
        <div className={cn("h-full rounded-full transition-[width]", tone === "success" ? "bg-success" : "bg-primary")} style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
