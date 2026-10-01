"use client";
import { useState, useTransition } from "react";
import { Clock, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createNote, deleteNote, updateNote } from "@/app/learn/[slug]/actions";
import type { Note } from "@/lib/data/learning-types";
import { playerClock } from "./player-clock";

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const textareaClass = "w-full rounded-lg border border-input bg-background p-3 text-sm placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

export function NoteItem({ slug, note, lessonTitle, lessonHref, onDeleted, onUpdated }: { slug: string; note: Note; lessonTitle?: string | null; lessonHref?: string | null; onDeleted?: (id: string) => void; onUpdated?: (n: Note) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <li className="rounded-lg border border-border bg-background p-4">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {lessonTitle ? (lessonHref ? <a href={lessonHref} className="font-medium text-primary hover:underline">{lessonTitle}</a> : <span className="font-medium text-foreground">{lessonTitle}</span>) : null}
        {note.video_timestamp_seconds != null ? <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" aria-hidden />{fmt(note.video_timestamp_seconds)}</span> : null}
        <span>{new Date(note.updated_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
        <span className="ml-auto flex gap-1">
          <button onClick={() => setEditing((v) => !v)} aria-label="Edit note" className="grid h-7 w-7 place-items-center rounded-md hover:bg-surface-2"><Pencil className="h-3.5 w-3.5" /></button>
          <button
            aria-label="Delete note"
            disabled={pending}
            onClick={() => { if (confirm("Delete this note? This can't be undone.")) start(async () => { const r = await deleteNote(slug, note.id); if (!r.ok) setError(r.error); else onDeleted?.(note.id); }); }}
            className="grid h-7 w-7 place-items-center rounded-md text-danger hover:bg-danger-soft"
          ><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      </div>
      {editing ? (
        <form onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await updateNote(slug, note.id, draft); if (r.ok) { setEditing(false); onUpdated?.({ ...note, content: draft.trim(), updated_at: new Date().toISOString() }); } else setError(r.error); }); }} className="space-y-2">
          <label className="sr-only" htmlFor={`edit-${note.id}`}>Edit note</label>
          <textarea id={`edit-${note.id}`} value={draft} onChange={(e) => setDraft(e.target.value)} rows={4} maxLength={10000} className={textareaClass} />
          <div className="flex gap-2">
            <Button size="sm" disabled={pending || !draft.trim()}>Save</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => { setEditing(false); setDraft(note.content); }}>Cancel</Button>
          </div>
        </form>
      ) : (
        <p className="text-sm whitespace-pre-wrap">{note.content}</p>
      )}
      {error ? <p role="alert" className="mt-2 text-xs text-danger">{error}</p> : null}
    </li>
  );
}

export function NewNoteForm({ slug, courseId, lessonId, allowTimestamp, onCreated }: { slug: string; courseId: string; lessonId: string | null; allowTimestamp?: boolean; onCreated?: (n: Note) => void }) {
  const [text, setText] = useState("");
  const [withTime, setWithTime] = useState(true);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const ts = allowTimestamp && withTime ? playerClock.seconds : null;
        start(async () => {
          const r = await createNote(slug, courseId, lessonId, text, ts);
          if (r.ok) { setText(""); setError(null); onCreated?.(r.data); } else setError(r.error);
        });
      }}
      className="space-y-2"
    >
      <label htmlFor="new-note" className="sr-only">New note</label>
      <textarea id="new-note" value={text} onChange={(e) => setText(e.target.value)} rows={3} maxLength={10000} placeholder="Write a note…" className={textareaClass} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {allowTimestamp ? (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" checked={withTime} onChange={(e) => setWithTime(e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
            Attach current video time (when available)
          </label>
        ) : <span />}
        <Button size="sm" disabled={pending || !text.trim()}>{pending ? "Saving…" : "Save note"}</Button>
      </div>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    </form>
  );
}

/**
 * Notes editor + list kept in client state: adding, editing or deleting a note updates the list
 * in place instead of re-rendering the whole learning page.
 */
export function NotesManager({ slug, courseId, lessonId, allowTimestamp, initial, lessonTitles, emptyText, newLabel }: {
  slug: string; courseId: string; lessonId: string | null; allowTimestamp?: boolean; initial: Note[];
  lessonTitles?: Record<string, string>; emptyText: string; newLabel?: string;
}) {
  const [notes, setNotes] = useState(initial);
  return (
    <div className="space-y-4">
      {newLabel ? <h3 className="text-sm font-semibold">{newLabel}</h3> : null}
      <NewNoteForm slug={slug} courseId={courseId} lessonId={lessonId} allowTimestamp={allowTimestamp} onCreated={(n) => setNotes((l) => [n, ...l])} />
      {notes.length ? (
        <ul className="space-y-3">
          {notes.map((n) => (
            <NoteItem
              key={n.id}
              slug={slug}
              note={n}
              lessonTitle={lessonTitles && n.lesson_id ? lessonTitles[n.lesson_id] ?? null : null}
              lessonHref={lessonTitles && n.lesson_id ? `/learn/${slug}/lesson/${n.lesson_id}` : null}
              onDeleted={(id) => setNotes((l) => l.filter((x) => x.id !== id))}
              onUpdated={(u) => setNotes((l) => l.map((x) => (x.id === u.id ? u : x)))}
            />
          ))}
        </ul>
      ) : <p className="text-sm text-muted-foreground">{emptyText}</p>}
    </div>
  );
}
