import Link from "next/link";
import { notFound } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LockedState, Panel, PortalPage } from "@/components/learn/portal";
import { NewNoteForm, NoteItem } from "@/components/learn/notes-panel";
import { getLearningContext, getNotes } from "@/lib/data/learning";

export default async function NotesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="My notes"><LockedState slug={slug} what="notes" /></PortalPage>;
  const notes = await getNotes(ctx.userId, ctx.course.id, { q: q?.slice(0, 100) });
  const lessonTitle = (id: string | null) => (id ? ctx.lessons.find((l) => l.id === id)?.title ?? null : null);

  return (
    <PortalPage title="My notes" description="Private notes for this course. Only you can see them.">
      <Panel title="New course note"><NewNoteForm slug={slug} courseId={ctx.course.id} lessonId={null} /></Panel>
      <div className="mt-6">
        <form role="search" className="mb-4 flex max-w-md gap-2">
          <label htmlFor="nq" className="sr-only">Search notes</label>
          <input id="nq" name="q" defaultValue={q} placeholder="Search your notes" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          {q ? <Link href="?" className="self-center text-sm text-muted-foreground hover:text-foreground">Clear</Link> : null}
        </form>
        {notes.length ? (
          <ul className="space-y-3">
            {notes.map((n) => <NoteItem key={n.id} slug={slug} note={n} lessonTitle={lessonTitle(n.lesson_id)} lessonHref={n.lesson_id ? `/learn/${slug}/lesson/${n.lesson_id}` : null} />)}
          </ul>
        ) : q ? <EmptyState title="No notes match your search" /> : <EmptyState icon={NotebookPen} title="No notes yet" description="Add notes here or from the Notes tab under any lesson." />}
      </div>
    </PortalPage>
  );
}
