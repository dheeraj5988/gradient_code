"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { UUID_RE, str } from "@/lib/admin/util";

const platformOf = (url: string) => {
  const h = new URL(url).hostname.replace(/^www\./, "");
  return h.endsWith("leetcode.com") ? "leetcode" : h.endsWith("hackerrank.com") ? "hackerrank" : h.endsWith("geeksforgeeks.org") ? "geeksforgeeks" : h.endsWith("codeforces.com") ? "codeforces" : "other";
};
const done = (courseId?: string) => { revalidatePath("/admin/problems"); if (courseId) revalidatePath("/learn", "layout"); };

/**
 * Bulk add: one problem per line — `Title | https://url | easy|medium|hard | Module title (optional)`.
 * Unknown modules go to "More practice". Duplicate URLs in a course are skipped. Added as drafts.
 */
export async function bulkAddProblems(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const s = g.ctx.supabase;
  const courseId = str(form, "course_id");
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Choose a course.", fieldErrors: { course_id: "Required" } };
  const lines = str(form, "lines").split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 300);
  if (!lines.length) return { ok: false, error: "Paste at least one line.", fieldErrors: { lines: "Required" } };
  const { data: mods } = await s.from("course_modules").select("id,title").eq("course_id", courseId);
  const modByTitle = new Map((mods ?? []).map((m) => [String(m.title).trim().toLowerCase(), m.id as string]));
  const { count } = await s.from("coding_problems").select("id", { count: "exact", head: true }).eq("course_id", courseId);
  const rows: Record<string, unknown>[] = [];
  const bad: number[] = [];
  lines.forEach((line, i) => {
    const [title = "", url = "", diff = "", mod = ""] = line.split("|").map((x) => x.trim());
    let ok = title.length >= 2 && title.length <= 200 && /^https:\/\/\S+$/.test(url);
    try { new URL(url); } catch { ok = false; }
    const difficulty = diff.toLowerCase();
    if (!ok || (difficulty && !["easy", "medium", "hard"].includes(difficulty))) { bad.push(i + 1); return; }
    rows.push({ course_id: courseId, module_id: mod ? modByTitle.get(mod.toLowerCase()) ?? null : null, title, url, platform: platformOf(url), difficulty: difficulty || null, order_index: (count ?? 0) + rows.length + 1, is_published: false });
  });
  if (bad.length) return { ok: false, error: `Fix line${bad.length > 1 ? "s" : ""} ${bad.slice(0, 10).join(", ")}: use “Title | https://url | easy/medium/hard | Module”.` };
  const { data, error } = await s.from("coding_problems").upsert(rows, { onConflict: "course_id,url", ignoreDuplicates: true }).select("id");
  if (error) return { ok: false, error: error.message.includes("coding_problems") && error.message.includes("exist") ? "Run migration 20261002090000_coding_problems.sql in Supabase first." : error.message };
  await audit(g.ctx, "problems.bulk_add", "course", courseId, `Added ${data?.length ?? 0} coding problems (drafts)`, { lines: lines.length });
  done();
  return { ok: true, data: null, message: `Added ${data?.length ?? 0} problem(s) as drafts${(data?.length ?? 0) < rows.length ? ` · ${rows.length - (data?.length ?? 0)} already existed` : ""}.` };
}

export async function setProblemPublished(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const value = str(form, "value") === "true";
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid problem." };
  const { data, error } = await g.ctx.supabase.from("coding_problems").update({ is_published: value }).eq("id", id).select("course_id").single();
  if (error) return { ok: false, error: error.message };
  done(data.course_id as string);
  return { ok: true, data: null };
}

export async function publishAllProblems(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const courseId = str(form, "course_id");
  if (!UUID_RE.test(courseId)) return { ok: false, error: "Filter by a course first." };
  const { data, error } = await g.ctx.supabase.from("coding_problems").update({ is_published: true }).eq("course_id", courseId).eq("is_published", false).select("id");
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "problems.publish_all", "course", courseId, `Published ${data?.length ?? 0} coding problems`, {});
  done(courseId);
  return { ok: true, data: null, message: `Published ${data?.length ?? 0} problem(s).` };
}

export async function deleteProblem(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid problem." };
  const { error } = await g.ctx.supabase.from("coding_problems").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  done();
  return { ok: true, data: null };
}

