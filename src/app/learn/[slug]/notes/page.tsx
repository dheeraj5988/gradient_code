import Link from "next/link";
import { notFound } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { LockedState, Panel, PortalPage } from "@/components/learn/portal";
import { NotesManager } from "@/components/learn/notes-panel";
import { getLearningContext, getNotes } from "@/lib/data/learning";

export default async function NotesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="My notes"><LockedState slug={slug} what="notes" /></PortalPage>;
  const notes = await getNotes(ctx.userId, ctx.course.id, { q: q?.slice(0, 100) });
  const lessonTitles = Object.fromEntries(ctx.lessons.map((l) => [l.id, l.title]));

  return (
    <PortalPage title="My notes" description="Private notes for this course. Only you can see them.">
      <div className="mt-6">
        <form role="search" className="mb-4 flex max-w-md gap-2">
          <label htmlFor="nq" className="sr-only">Search notes</label>
          <input id="nq" name="q" defaultValue={q} placeholder="Search your notes" className="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          {q ? <Link href="?" className="self-center text-sm text-muted-foreground hover:text-foreground">Clear</Link> : null}
        </form>
        {q && !notes.length ? <EmptyState title="No notes match your search" /> : (
          <Panel title="Course notes">
            {/* Client-side list: add/edit/delete update in place without reloading the page. */}
            <NotesManager slug={slug} courseId={ctx.course.id} lessonId={null} initial={notes} lessonTitles={lessonTitles} emptyText="No notes yet — add one above, or from the Notes tab under any lesson." />
          </Panel>
        )}
      </div>
    </PortalPage>
  );
}
