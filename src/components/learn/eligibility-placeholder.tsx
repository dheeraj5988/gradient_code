import { Check, Circle } from "lucide-react";

/** Honest placeholder: lists requirement categories without inventing thresholds or status. */
export function EligibilityPlaceholder({ items, note }: { items: { label: string; value?: string; done?: boolean }[]; note: string }) {
  return (
    <div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 px-4 py-3 text-sm">
            {i.done ? <Check className="h-4 w-4 text-success" aria-label="Met" /> : <Circle className="h-4 w-4 text-subtle-foreground" aria-hidden />}
            <span className="flex-1">{i.label}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{i.value ?? "Not configured yet"}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">{note}</p>
    </div>
  );
}
