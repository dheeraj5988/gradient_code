import { ChevronDown, FileText, Lock, PlayCircle, Radio } from "lucide-react";
import type { Module } from "@/lib/data/types";
import { formatDuration } from "@/lib/utils";

export function Curriculum({ modules }: { modules: Module[] }) {
  const lessons = modules.flatMap((m) => m.lessons);
  const total = lessons.reduce((s, l) => s + l.duration_seconds, 0);
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {modules.length} sections · {lessons.length} lessons · {formatDuration(total)} total
      </p>
      <div className="overflow-hidden rounded-2xl border border-border">
        {modules.map((m, i) => (
          <details key={m.id} open={i === 0} className="group border-b border-border last:border-0">
            <summary className="flex cursor-pointer items-center justify-between gap-3 bg-surface px-4 py-3.5 hover:bg-surface-2">
              <span className="flex items-center gap-2 font-medium">
                <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                {m.title}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {m.lessons.length} lessons · {formatDuration(m.lessons.reduce((s, l) => s + l.duration_seconds, 0))}
              </span>
            </summary>
            <ul className="divide-y divide-border/60">
              {m.lessons.map((l) => {
                const Icon = l.type === "text" ? FileText : l.type === "live" ? Radio : PlayCircle;
                return (
                  <li key={l.id} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                    <span className="flex items-center gap-2.5">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {l.title}
                    </span>
                    <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                      {l.is_free_preview ? <span className="font-semibold text-brand-pink">Preview</span> : <Lock className="h-3.5 w-3.5" />}
                      {l.duration_seconds ? formatDuration(l.duration_seconds) : null}
                    </span>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
