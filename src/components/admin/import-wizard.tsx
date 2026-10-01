"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Folder, PlayCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { fieldClass } from "@/components/ui/input";
import { runDriveImport, scanDriveFolder } from "@/app/admin/import/actions";
import { cn } from "@/lib/utils";

const mb = (n: number | null) => (n ? `${(n / 1e6).toFixed(n > 1e8 ? 0 : 1)} MB` : "");

export function ImportWizard({ courses, sources, defaultCourse, configured }: { courses: { id: string; title: string }[]; sources: readonly { label: string; folderId: string; note: string }[]; defaultCourse?: string; configured: boolean }) {
  const [scanState, scanAction, scanning] = useActionState(scanDriveFolder, null);
  const [importState, importAction, importing] = useActionState(runDriveImport, null);
  const [folder, setFolder] = useState("");
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const toggle = (k: string) => setExcluded((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
  const scan = scanState?.ok ? scanState.data : null;
  const plan = scan?.plan;

  if (importState?.ok) {
    const r = importState.data;
    return (
      <section role="status" className="rounded-xl border border-success/30 bg-success-soft p-6">
        <h2 className="flex items-center gap-2 font-semibold text-success"><CheckCircle2 className="h-5 w-5" aria-hidden />Imported as draft</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {r.createdCourse ? <li>Created a new <strong>draft</strong> course.</li> : null}
          <li>{r.modulesCreated} modules, {r.lessonsCreated} lessons and {r.resourcesCreated} resources added — all <strong>unpublished</strong>.</li>
          {r.captionsAdded || r.descriptionsAdded ? <li>{r.captionsAdded} subtitle tracks and {r.descriptionsAdded} descriptions added.</li> : null}
          {r.modulesLinked ? <li>{r.modulesLinked} existing modules were matched by name and linked to their Drive folders.</li> : null}
          {r.skippedExisting ? <li>{r.skippedExisting} items were already imported and were left untouched.</li> : null}
          {r.excluded ? <li>{r.excluded} items were excluded by you.</li> : null}
        </ul>
        {r.failed.length ? (
          <div role="alert" className="mt-3 rounded-lg border border-danger/30 bg-danger-soft p-3 text-sm text-danger">
            <p className="font-semibold">{r.failed.length} part{r.failed.length > 1 ? "s" : ""} could not be imported. Everything else was saved; run the import again to retry.</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">{r.failed.slice(0, 20).map((f) => <li key={f}>{f}</li>)}</ul>
          </div>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">Next: review lesson titles, mark a free preview lesson, publish lessons, then publish the course.</p>
        <div className="mt-4 flex gap-2"><ButtonLink href={`/admin/courses/${r.courseId}/curriculum`} size="sm">Review curriculum</ButtonLink><ButtonLink href={`/admin/courses/${r.courseId}/edit`} variant="outline" size="sm">Course settings</ButtonLink></div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      {!configured ? (
        <div role="alert" className="flex gap-3 rounded-xl border border-warning/30 bg-warning-soft p-4 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" aria-hidden />
          <div><p className="font-semibold">BLOCKED — Google Drive is not configured</p><p className="mt-1 text-muted-foreground">Add GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY on the server and share your course folders with that email. See <Link href="/admin/settings" className="text-primary hover:underline">Settings</Link>.</p></div>
        </div>
      ) : null}

      <form action={(fd) => { setExcluded(new Set()); scanAction(fd); }} className="space-y-4 rounded-xl border border-border bg-card p-5">
        <h2 className="text-sm font-semibold">1. Choose a Drive folder</h2>
        <div className="grid gap-4 md:grid-cols-[1fr_280px]">
          <div>
            <label htmlFor="folder" className="mb-1.5 block text-sm font-medium">Folder URL or ID</label>
            <input id="folder" name="folder" required value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="https://drive.google.com/drive/folders/…" className={cn(fieldClass, "font-mono")} />
          </div>
          <div>
            <label htmlFor="course_id" className="mb-1.5 block text-sm font-medium">Import into</label>
            <select id="course_id" name="course_id" defaultValue={defaultCourse ?? ""} className={fieldClass}>
              <option value="">A new draft course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        {sources.length ? (
          <div className="text-xs">
            <p className="mb-1.5 text-muted-foreground">Known course folders:</p>
            <ul className="space-y-1">
              {sources.map((s) => (
                <li key={s.folderId} className="flex flex-wrap items-baseline gap-x-2">
                  <button type="button" onClick={() => setFolder(s.folderId)} className="font-medium text-primary hover:underline">{s.label}</button>
                  <span className={cn("text-muted-foreground", s.note.startsWith("SOURCE INACCESSIBLE") && "text-danger")}>{s.note}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <Button disabled={scanning || !configured}>{scanning ? "Scanning Drive…" : "Scan folder"}</Button>
        {scanState && !scanState.ok ? <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{scanState.error}</p> : null}
      </form>

      {plan && scan ? (
        <form action={importAction} onSubmit={(e) => { if (!window.confirm("Import the selected items as unpublished drafts?")) e.preventDefault(); }} className="space-y-4">
          <input type="hidden" name="folder" value={scan.folderId} />
          <input type="hidden" name="course_id" value={scan.courseId ?? ""} />
          {[...excluded].map((k) => <input key={k} type="hidden" name="exclude" value={k} />)}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="text-sm font-semibold">2. Review the mapping</h2>
            <p className="mt-1 text-sm text-muted-foreground">From <strong>{plan.root.name}</strong> → {scan.courseTitle ? <>existing course <strong>{scan.courseTitle}</strong></> : "a new draft course"}.</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[["Modules", plan.totals.modules], ["Video lessons", plan.totals.lessons], ["Resources", plan.totals.resources], ["Subtitles", plan.totals.captions], ["Descriptions", plan.totals.descriptions], ["Already imported", plan.totals.alreadyImported], ["Skipped", plan.totals.skipped]].map(([l, v]) => (
                <div key={l as string} className="rounded-lg border border-border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-xl font-bold tabular-nums">{v}</dd></div>
              ))}
            </dl>
            {plan.warnings.length ? <ul className="mt-3 space-y-1 text-sm text-warning">{plan.warnings.map((w) => <li key={w}>⚠ {w}</li>)}</ul> : null}
            {!scan.courseId ? (
              <div className="mt-4 max-w-lg">
                <label htmlFor="title" className="mb-1.5 block text-sm font-medium">New course title</label>
                <input id="title" name="title" defaultValue={plan.suggestedTitle} className={fieldClass} />
              </div>
            ) : null}
          </section>

          <ol className="space-y-3">
            {plan.modules.map((m, i) => {
              const mOff = excluded.has(`m:${m.key}`);
              return (
                <li key={m.key} className={cn("rounded-xl border border-border bg-card", mOff && "opacity-60")}>
                  <label className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-3">
                    <input type="checkbox" checked={!mOff} onChange={() => toggle(`m:${m.key}`)} className="h-4 w-4 accent-[var(--primary)]" aria-label={`Include module ${m.title}`} />
                    <Folder className="h-4 w-4 text-subtle-foreground" aria-hidden />
                    <span className="min-w-0 flex-1"><span className="block font-semibold">{i + 1}. {m.title}</span><span className="block truncate text-xs text-muted-foreground">{m.sourceName}{m.exists ? " · matches an existing module — new files are added to it" : ""}</span></span>
                    <span className="text-xs text-muted-foreground">{m.lessons.length} videos · {m.resources.length} resources</span>
                  </label>
                  <details>
                    <summary className="cursor-pointer px-4 py-2 text-xs font-medium text-primary">Show files</summary>
                    <ul className="divide-y divide-border">
                      {[...m.lessons.map((l) => ({ ...l, t: "lesson" as const })), ...m.resources.map((r) => ({ ...r, t: "resource" as const }))].map((f) => {
                        const off = excluded.has(`f:${f.driveFileId}`);
                        return (
                          <li key={f.driveFileId} className="flex items-center gap-3 px-4 py-2 text-sm">
                            <input type="checkbox" disabled={f.exists || mOff} checked={!off && !f.exists} onChange={() => toggle(`f:${f.driveFileId}`)} className="h-4 w-4 accent-[var(--primary)]" aria-label={`Include ${f.driveName}`} />
                            {f.t === "lesson" ? <PlayCircle className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden /> : <FileText className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />}
                            <span className="min-w-0 flex-1"><span className="block truncate">{f.title}</span><span className="block truncate font-mono text-[11px] text-subtle-foreground">{f.driveName}</span></span>
                            <span className="shrink-0 text-xs text-muted-foreground">{f.exists ? "Already imported" : f.t === "resource" ? (f as { resourceType: string }).resourceType.replace("_", " ") : [mb(f.size), "captions" in f && f.captions.length ? `CC ×${f.captions.length}` : "", "descriptionFileId" in f && (f.descriptionFileId || f.description) ? "description" : ""].filter(Boolean).join(" · ")}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </li>
              );
            })}
          </ol>

          {plan.skipped.length ? (
            <details className="rounded-xl border border-border bg-card p-4 text-sm">
              <summary className="cursor-pointer font-medium">{plan.skipped.length} skipped file{plan.skipped.length > 1 ? "s" : ""}</summary>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">{plan.skipped.slice(0, 200).map((s, i) => <li key={i}><span className="font-mono">{s.path ? `${s.path} / ` : ""}{s.name}</span> — {s.reason}</li>)}</ul>
            </details>
          ) : null}

          <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 py-3 backdrop-blur">
            <Button disabled={importing || !plan.totals.lessons && !plan.totals.resources}>{importing ? "Importing…" : "Import as draft"}</Button>
            <p className="text-xs text-muted-foreground">Nothing is published. Existing lessons are never overwritten or deleted.</p>
            {importState && !importState.ok ? <p role="alert" className="w-full rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{importState.error}</p> : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
