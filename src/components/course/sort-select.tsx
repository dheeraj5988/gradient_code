"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SORTS = [
  ["popular", "Most relevant"],
  ["rating", "Highest rated"],
  ["newest", "Newest"],
  ["price-low", "Price: low to high"],
  ["price-high", "Price: high to low"],
] as const;

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      Sort by
      <select
        value={sp.get("sort") ?? "popular"}
        onChange={(e) => {
          const p = new URLSearchParams(sp.toString());
          p.set("sort", e.target.value);
          p.delete("page");
          router.push(`${pathname}?${p.toString()}`);
        }}
        className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
      >
        {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
