import { BookText, Database, ExternalLink, FileCode2, FileText, FolderGit2, Presentation, Video, Download, LayoutTemplate, File } from "lucide-react";
import type { Resource } from "@/lib/data/learning-types";

const META: Record<Resource["resource_type"], { icon: typeof FileText; label: string }> = {
  pdf: { icon: FileText, label: "PDF" },
  notes: { icon: BookText, label: "Notes" },
  cheat_sheet: { icon: FileCode2, label: "Cheat sheet" },
  external_link: { icon: ExternalLink, label: "Link" },
  code_repository: { icon: FolderGit2, label: "Code repository" },
  dataset: { icon: Database, label: "Dataset" },
  template: { icon: LayoutTemplate, label: "Template" },
  presentation: { icon: Presentation, label: "Slides" },
  recording: { icon: Video, label: "Recording" },
  other: { icon: File, label: "File" },
};

export function ResourceCard({ r, href, context }: { r: Resource; href: string | null; context?: string | null }) {
  const m = META[r.resource_type];
  const download = r.is_downloadable && !!(r.file_path || r.drive_file_id);
  return (
    <article className="flex gap-4 rounded-xl border border-border bg-card p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><m.icon className="h-5 w-5" aria-hidden /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-semibold">{r.title}</h3>
          <span className="rounded border border-border px-1.5 py-px text-[11px] text-muted-foreground">{m.label}</span>
        </div>
        {context ? <p className="mt-0.5 text-xs text-subtle-foreground">{context}</p> : null}
        {r.description ? <p className="mt-1 text-sm text-muted-foreground">{r.description}</p> : null}
      </div>
      {href ? (
        <a href={href} target={download ? undefined : "_blank"} rel="noopener noreferrer" className="inline-flex h-9 shrink-0 items-center gap-1.5 self-center rounded-lg border border-border-strong px-3 text-sm font-medium hover:bg-surface">
          {download ? <Download className="h-4 w-4" aria-hidden /> : <ExternalLink className="h-4 w-4" aria-hidden />}
          <span className="hidden sm:inline">{download ? "Download" : "Open"}</span>
          <span className="sr-only">{r.title}</span>
        </a>
      ) : <span className="self-center text-xs text-muted-foreground">Unavailable</span>}
    </article>
  );
}
