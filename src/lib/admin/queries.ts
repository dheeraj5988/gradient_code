import "server-only";
import type { AdminCtx } from "./guard";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function countOf(ctx: AdminCtx, table: string, apply?: (q: any) => any): Promise<number | null> {
  let q = ctx.supabase.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count, error } = await q;
  return error ? null : (count ?? 0);
}

/** Map user ids → {name,email} from profiles in one query. */
export async function profilesById(ctx: AdminCtx, ids: string[]) {
  const unique = [...new Set(ids)].filter(Boolean);
  if (!unique.length) return new Map<string, { full_name: string; email: string | null }>();
  const { data } = await ctx.supabase.from("profiles").select("id,full_name,email").in("id", unique);
  return new Map((data ?? []).map((p: any) => [p.id as string, { full_name: p.full_name as string, email: p.email as string | null }]));
}

export async function courseStats(ctx: AdminCtx, ids?: string[]) {
  let q = ctx.supabase.from("admin_course_stats").select("*");
  if (ids) q = q.in("course_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
  const { data } = await q;
  return new Map((data ?? []).map((r: any) => [r.course_id as string, r as { modules: number; lessons: number; published_lessons: number; video_lessons_missing_media: number; preview_lessons: number; total_seconds: number }]));
}

export async function courseOptions(ctx: AdminCtx) {
  const { data } = await ctx.supabase.from("courses").select("id,title,status,is_demo").order("title");
  return (data ?? []) as { id: string; title: string; status: string; is_demo: boolean }[];
}
