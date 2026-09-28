import { Star } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

export function Rating({ value, count, size = "sm" }: { value: number; count?: number; size?: "sm" | "md" }) {
  if (!value) return <span className="text-xs text-muted-foreground">New</span>;
  const px = size === "sm" ? 14 : 18;
  return (
    <span className="inline-flex items-center gap-1.5" aria-label={`Rated ${value} out of 5`}>
      <span className="font-semibold text-warning">{value.toFixed(1)}</span>
      <span className="flex">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} width={px} height={px} className={cn(i <= Math.round(value) ? "fill-warning text-warning" : "text-border")} />
        ))}
      </span>
      {count != null ? <span className="text-xs text-muted-foreground">({formatCount(count)})</span> : null}
    </span>
  );
}
