import { FileText, Lock, PlayCircle, Radio } from "lucide-react";
import type { Module } from "@/lib/data/types";
import { formatDuration } from "@/lib/utils";
import { Accordion, AccordionItem } from "@/components/ui/accordion";

export function Curriculum({ modules, initiallyOpen = 1 }: { modules: Module[]; initiallyOpen?: number }) {
  const lessons = modules.flatMap((m) => m.lessons);
  const total = lessons.reduce((s, l) => s + l.duration_seconds, 0);
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {modules.length} sections · {lessons.length} lessons{total ? ` · ${formatDuration(total)} total length` : ""}
      </p>
      <Accordion>
        {modules.map((m, i) => {
          const secs = m.lessons.reduce((s, l) => s + l.duration_seconds, 0);
          return (
            <AccordionItem key={m.id} defaultOpen={i < initiallyOpen} title={m.title} meta={`${m.lessons.length} lessons${secs ? ` · ${formatDuration(secs)}` : ""}`}>
              <ul className="divide-y divide-border bg-background">
                {m.lessons.map((l) => {
                  const Icon = l.type === "text" ? FileText : l.type === "live" ? Radio : PlayCircle;
                  return (
                    <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm sm:px-5 sm:pl-11">
                      <span className="flex min-w-0 items-center gap-2.5">
                        <Icon className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />
                        <span className="min-w-0">{l.title}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                        {l.is_free_preview ? <span className="font-medium text-primary">Preview</span> : <Lock className="h-3.5 w-3.5 text-subtle-foreground" aria-label="Locked" />}
                        {l.duration_seconds ? <span className="tabular-nums">{formatDuration(l.duration_seconds)}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
