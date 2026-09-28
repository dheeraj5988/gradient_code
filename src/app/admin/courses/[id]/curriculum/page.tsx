import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, PlayCircle, Radio } from "lucide-react";
import { AdminHeader, StatusPill } from "@/components/admin/table";
import { IconAction, InlineForm } from "@/components/admin/curriculum-bits";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { formatDuration } from "@/lib/utils";
import { deleteLesson, deleteModule, moveLesson, moveModule, quickAddLesson, saveModule, toggleLessonFlag } from "../../curriculum-actions";

export const metadata = { title: "Curriculum" };

type L = { id: string; module_id: string; title: string; type: string; duration_seconds: number; is_published: boolean; is_free_preview: boolean; video_provider: string; video_url: string | null; drive_file_id: string | null; order_index: number };

export default async function Curriculum({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const { data: course } = await ctx.supabase.from("courses").select("id,title,slug,status,is_demo").eq("id", id).maybeSingle();
  if (!course) notFound();
  const { data: modules } = await ctx.supabase.from("course_modules").select("id,title,description,order_index,drive_folder_id").eq("course_id", id).order("order_index").order("created_at");
  const ids = (modules ?? []).map((m) => m.id);
  const { data: lessons } = ids.length
    ? await ctx.supabase.from("lessons").select("id,module_id,title,type,duration_seconds,is_published,is_free_preview,video_provider,video_url,drive_file_id,order_index").in("module_id", ids).order("order_index").order("created_at")
    : { data: [] as L[] };
  const all = (lessons ?? []) as L[];

  return (
    <div className="mx-auto max-w-5xl">
      <AdminHeader
        title="Curriculum"
        crumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.title, href: `/admin/courses/${id}/edit` }, { label: "Curriculum" }]}
        description={<span className="flex flex-wrap items-center gap-2"><StatusPill status={course.status} />{modules?.length ?? 0} modules · {all.filter((l) => l.is_published).length}/{all.length} lessons published</span>}
        actions={<><ButtonLink href={`/admin/courses/${id}/edit`} variant="outline" size="sm">Course settings</ButtonLink><ButtonLink href={`/admin/import?course=${id}`} variant="outline" size="sm">Import from Drive</ButtonLink></>}
      />
      {!modules?.length ? <EmptyState className="mb-6" title="No modules yet" description="Add your first module below, or import a Drive folder." /> : null}
      <ol className="space-y-4">
        {(modules ?? []).map((m, mi) => {
          const ls = all.filter((l) => l.module_id === m.id);
          return (
            <li key={m.id} className="rounded-xl border border-border bg-card">
              <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
                <span className="text-xs font-semibold text-subtle-foreground">Module {mi + 1}</span>
                <h2 className="min-w-[8rem] flex-1 truncate font-semibold">{m.title}</h2>
                <span className="text-xs text-muted-foreground">{ls.length} lesson{ls.length === 1 ? "" : "s"}</span>
                <span className="flex">
                  <IconAction action={moveModule} hidden={{ id: m.id, dir: "up" }} label="Move module up" icon="up" />
                  <IconAction action={moveModule} hidden={{ id: m.id, dir: "down" }} label="Move module down" icon="down" />
                  <IconAction action={deleteModule} hidden={{ id: m.id }} label="Delete module" icon="trash" tone="danger" confirm={`Delete module “${m.title}”? Only empty modules can be deleted.`} />
                </span>
              </div>
              <details className="border-b border-border px-4 py-2 text-sm">
                <summary className="cursor-pointer text-xs font-medium text-primary">Rename module</summary>
                <div className="py-2"><InlineForm action={saveModule.bind(null, id, m.id)} placeholder="Module title" submit="Save" defaultValue={m.title} /></div>
              </details>
              <ul className="divide-y divide-border">
                {ls.map((l, li) => {
                  const Icon = l.type === "text" ? FileText : l.type === "live" ? Radio : PlayCircle;
                  const noMedia = l.type === "video" && !l.video_url && !l.drive_file_id;
                  return (
                    <li key={l.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                      <span className="w-6 text-xs text-subtle-foreground tabular-nums">{li + 1}</span>
                      <Icon className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />
                      <Link href={`/admin/courses/${id}/lessons/${l.id}`} className="min-w-[10rem] flex-1 truncate font-medium hover:text-primary">{l.title}</Link>
                      <span className="ml-auto flex flex-wrap items-center gap-1.5">
                        {!l.is_published ? <StatusPill status="draft" /> : null}
                        {l.is_free_preview ? <span className="rounded-md border border-primary/20 bg-primary-soft px-1.5 py-px text-[11px] font-semibold text-primary">Preview</span> : null}
                        {l.type === "video" && !noMedia ? <span className="rounded-md border border-border px-1.5 py-px text-[11px] text-muted-foreground">{l.video_provider === "drive" ? "Drive" : l.video_provider}</span> : null}
                        {noMedia ? <span className="rounded-md border border-danger/20 bg-danger-soft px-1.5 py-px text-[11px] font-semibold text-danger">No video</span> : null}
                        {l.duration_seconds ? <span className="text-xs text-muted-foreground tabular-nums">{formatDuration(l.duration_seconds)}</span> : null}
                      </span>
                      <span className="flex">
                        <IconAction action={toggleLessonFlag} hidden={{ id: l.id, field: "is_published", value: String(!l.is_published) }} label={l.is_published ? "Unpublish lesson" : "Publish lesson"} icon={l.is_published ? "eyeOff" : "eye"} />
                        <IconAction action={moveLesson} hidden={{ id: l.id, dir: "up" }} label="Move lesson up" icon="up" />
                        <IconAction action={moveLesson} hidden={{ id: l.id, dir: "down" }} label="Move lesson down" icon="down" />
                        <IconAction action={deleteLesson} hidden={{ id: l.id }} label="Delete lesson" icon="trash" tone="danger" confirm={`Delete lesson “${l.title}”? This can't be undone.`} />
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className="px-4 py-3"><InlineForm action={quickAddLesson.bind(null, id, m.id)} placeholder="New lesson title" submit="Add lesson" withType /></div>
            </li>
          );
        })}
      </ol>
      <section className="mt-6 rounded-xl border border-dashed border-border-strong bg-card p-4">
        <h2 className="mb-2 text-sm font-semibold">Add module</h2>
        <InlineForm action={saveModule.bind(null, id, null)} placeholder="Module title" submit="Add module" />
      </section>
    </div>
  );
}
