import { Star } from "lucide-react";
import { cn, formatCount } from "@/lib/utils";

/** Shows nothing-fake: when there are no ratings, renders null (caller decides the fallback). */
export function Rating({ value, count, size = "sm", className }: { value: number; count?: number; size?: "sm" | "md"; className?: string }) {
  if (!value || !count) return null;
  const px = size === "sm" ? 14 : 16;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-sm", className)}>
      <span className="font-semibold text-rating">{value.toFixed(1)}</span>
      <span className="flex" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} width={px} height={px} className={cn(i <= Math.round(value) ? "fill-rating text-rating" : "fill-border text-border")} />
        ))}
      </span>
      <span className="sr-only">Rated {value.toFixed(1)} out of 5</span>
      <span className="text-xs text-muted-foreground">({formatCount(count)} {count === 1 ? "rating" : "ratings"})</span>
    </span>
  );
}
