import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { LockedState, PortalPage } from "@/components/learn/portal";
import { ResourceCard } from "@/components/resources/resource-card";
import { getLearningContext, getResources, resourceHref } from "@/lib/data/learning";

export default async function ResourcesPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ q?: string }> }) {
  const { slug } = await params;
  const { q } = await searchParams;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  if (ctx.access !== "enrolled") return <PortalPage title="Resources"><LockedState slug={slug} what="course resources" /></PortalPage>;
  let resources = await getResources(ctx.course.id);
  const total = resources.length;
  if (q) resources = resources.filter((r) => `${r.title} ${r.description ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  const hrefs = await Promise.all(resources.map(resourceHref));
  const byModule = new Map<string, typeof resources>();
  resources.forEach((r) => byModule.set(r.module_id ?? "course", [...(byModule.get(r.module_id ?? "course") ?? []), r]));
  const sections = [
    ...(byModule.has("course") ? [["course", "Course-wide"] as const] : []),
    ...ctx.modules.filter((m) => byModule.has(m.id)).map((m) => [m.id, m.title] as const),
  ];
  const lessonTitle = (id: string | null) => (id ? ctx.lessons.find((l) => l.id === id)?.title : null);

  return (
    <PortalPage title="Resources" description="Notes, cheat sheets, code and reference material for this course.">
      {total ? (
        <>
          <form role="search" className="mb-5 max-w-sm">
            <label htmlFor="rq" className="sr-only">Search resources</label>
            <input id="rq" name="q" defaultValue={q} placeholder="Search resources" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </form>
          {resources.length ? (
            <div className="space-y-8">
              {sections.map(([id, title]) => {
                const items = byModule.get(id)!;
                return (
                  <section key={id}>
                    <h2 className="mb-3 text-sm font-semibold">{title}</h2>
                    <div className="space-y-3">{items.map((r) => <ResourceCard key={r.id} r={r} href={hrefs[resources.indexOf(r)]} context={lessonTitle(r.lesson_id) ? `Lesson: ${lessonTitle(r.lesson_id)}` : null} />)}</div>
                  </section>
                );
              })}
            </div>
          ) : <EmptyState title="No resources match your search" />}
        </>
      ) : (
        <EmptyState icon={BookOpen} title="No resources yet" description="No resources have been published for this course yet." />
      )}
    </PortalPage>
  );
}
