import "server-only";
import type { AdminCtx } from "./guard";
import type { ScopeData } from "@/components/admin/scope-picker";

/** Options for course/module/topic/lesson pickers. Bounded: non-archived courses only. */
export async function loadScope(ctx: AdminCtx, want: { topics?: boolean; lessons?: boolean } = {}): Promise<ScopeData> {
  const s = ctx.supabase;
  const { data: courses } = await s.from("courses").select("id,title").neq("status", "archived").order("title");
  const ids = (courses ?? []).map((c) => c.id);
  const [{ data: modules }, topics, lessons] = await Promise.all([
    s.from("course_modules").select("id,course_id,title,order_index").in("course_id", ids.length ? ids : ["-"]).order("order_index"),
    want.topics ? s.from("course_topics").select("id,course_id,name").order("order_index") : Promise.resolve({ data: [] }),
    want.lessons ? s.from("lessons").select("id,title,module_id").order("order_index").limit(5000) : Promise.resolve({ data: [] }),
  ]);
  const modCourse = new Map((modules ?? []).map((m) => [m.id as string, m.course_id as string]));
  return {
    courses: courses ?? [],
    modules: (modules ?? []).map((m) => ({ id: m.id, course_id: m.course_id, title: m.title })),
    topics: (topics.data ?? []) as ScopeData["topics"],
    lessons: ((lessons.data ?? []) as { id: string; title: string; module_id: string }[]).filter((l) => modCourse.has(l.module_id)).map((l) => ({ id: l.id, title: l.title, course_id: modCourse.get(l.module_id)! })),
  };
}
