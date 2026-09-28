import "server-only";
import { courseCompleteness } from "./completeness";
import type { AdminCtx } from "./guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function loadCompleteness(ctx: AdminCtx, courseId: string) {
  const s = ctx.supabase;
  const [{ data: c }, { data: modules }] = await Promise.all([
    s.from("courses").select("*").eq("id", courseId).maybeSingle(),
    s.from("course_modules").select("id,title,order_index").eq("course_id", courseId).order("order_index"),
  ]);
  if (!c) return null;
  const ids = (modules ?? []).map((m) => m.id);
  const { data: lessons } = ids.length
    ? await s.from("lessons").select("id,module_id,title,type,video_url,drive_file_id,description,content_text,is_published,is_free_preview").in("module_id", ids)
    : { data: [] as any[] };
  return {
    course: c,
    result: courseCompleteness({
      title: c.title, description: c.description ?? "", subtitle: c.subtitle, thumbnail_url: c.thumbnail_url, track: c.track, level: c.level, price: c.price == null ? null : Number(c.price), what_you_learn: c.what_you_learn ?? [],
      modules: (modules ?? []).map((m) => ({
        title: m.title,
        lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id).map((l: any) => ({
          title: l.title, type: l.type, is_published: l.is_published, is_free_preview: l.is_free_preview,
          hasMedia: !!(l.video_url || l.drive_file_id), hasDescription: !!(l.description?.trim() || l.content_text?.trim()),
        })),
      })),
    }),
  };
}

