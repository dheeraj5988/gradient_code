"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { SLUG_RE, UUID_RE, bool, lines, num, parseDriveId, slugify, str } from "@/lib/admin/util";

/* eslint-disable @typescript-eslint/no-explicit-any */

const QTYPES = ["mcq", "multi_select", "true_false", "short_answer", "coding", "debugging", "output_prediction", "scenario"];
const DIFFS = ["easy", "medium", "hard"];
const RTYPES = ["pdf", "notes", "cheat_sheet", "external_link", "code_repository", "dataset", "template", "presentation", "recording", "other"];
const optUuid = (v: string) => (v && UUID_RE.test(v) ? v : null);

function revalidateLearning() {
  revalidatePath("/admin", "layout");
  revalidatePath("/learn", "layout");
}

/* ---------------------------------- Topics ---------------------------------- */

export async function saveTopic(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const courseId = str(form, "course_id");
  const name = str(form, "name");
  const slug = str(form, "slug") || slugify(name);
  const order = num(form, "order_index");
  const errs: Record<string, string> = {};
  if (!UUID_RE.test(courseId)) errs.course_id = "Choose a course.";
  if (name.length < 2 || name.length > 120) errs.name = "2–120 characters.";
  if (!SLUG_RE.test(slug)) errs.slug = "Lowercase letters, numbers and hyphens.";
  if (order != null && (Number.isNaN(order) || order < 0)) errs.order_index = "Enter 0 or more.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const row = { course_id: courseId, module_id: optUuid(str(form, "module_id")), name, slug, description: str(form, "description") || null, order_index: order ?? 0 };
  const q = id ? g.ctx.supabase.from("course_topics").update(row).eq("id", id).select("id").single() : g.ctx.supabase.from("course_topics").insert(row).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: error.code === "23505" ? "A topic with this slug already exists in the course." : error.message };
  await audit(g.ctx, id ? "topic.update" : "topic.create", "topic", data.id, `${id ? "Updated" : "Created"} topic “${name}”`, { course_id: courseId });
  revalidateLearning();
  return { ok: true, data: { id: data.id }, message: id ? "Topic saved." : "Topic created." };
}

export async function deleteTopic(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid topic." };
  const { count } = await g.ctx.supabase.from("practice_questions").select("id", { count: "exact", head: true }).eq("topic_id", id);
  if (count) return { ok: false, error: `${count} question(s) use this topic. Move them first.` };
  const { error } = await g.ctx.supabase.from("course_topics").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "topic.delete", "topic", id, "Deleted topic");
  revalidateLearning();
  return { ok: true, data: null, message: "Topic deleted." };
}

/* --------------------------------- Questions --------------------------------- */

/** Create/update a question AND its answer key. The key lives in practice_answer_keys (admin-only RLS). */
export async function saveQuestion(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const { ctx } = g;
  const courseId = str(form, "course_id");
  const type = str(form, "type");
  const title = str(form, "title");
  const prompt = str(form, "prompt");
  const difficulty = str(form, "difficulty");
  const category = str(form, "category") === "interview" ? "interview" : "practice";
  const points = num(form, "points");
  const minutes = num(form, "estimated_minutes");
  const day = num(form, "day_number");
  const order = num(form, "order_index");
  let options = lines(form, "options");
  if (type === "true_false") options = ["True", "False"];
  const correct = str(form, "correct_options").split(",").map((x) => x.trim()).filter(Boolean).map(Number);
  const accepted = lines(form, "accepted_answers");
  const errs: Record<string, string> = {};
  if (!UUID_RE.test(courseId)) errs.course_id = "Choose a course.";
  if (!QTYPES.includes(type)) errs.type = "Choose a type.";
  if (!DIFFS.includes(difficulty)) errs.difficulty = "Choose a difficulty.";
  if (title.length < 3 || title.length > 200) errs.title = "3–200 characters.";
  if (prompt.length < 5 || prompt.length > 20000) errs.prompt = "Write the question (5+ characters).";
  if (points == null || Number.isNaN(points) || points < 0 || points > 1000) errs.points = "0–1000.";
  if (minutes == null || Number.isNaN(minutes) || minutes < 1 || minutes > 600) errs.estimated_minutes = "1–600.";
  if (day != null && (Number.isNaN(day) || day < 1)) errs.day_number = "1 or more.";
  if (["mcq", "multi_select"].includes(type) && options.length < 2) errs.options = "Add at least two options (one per line).";
  if (["mcq", "multi_select", "true_false"].includes(type) && category === "practice") {
    const n = options.length;
    if (!correct.length || correct.some((c) => !Number.isInteger(c) || c < 1 || c > n)) errs.correct_options = `Enter option number(s) between 1 and ${n}, comma separated.`;
    else if (type !== "multi_select" && correct.length !== 1) errs.correct_options = "Exactly one correct option.";
  }
  if (["short_answer", "output_prediction"].includes(type) && category === "practice" && !accepted.length) errs.accepted_answers = "Add at least one accepted answer.";
  const slug = str(form, "slug") || slugify(title);
  if (!SLUG_RE.test(slug)) errs.slug = "Lowercase letters, numbers and hyphens.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };

  const row = {
    course_id: courseId,
    module_id: optUuid(str(form, "module_id")),
    topic_id: optUuid(str(form, "topic_id")),
    lesson_id: optUuid(str(form, "lesson_id")),
    category,
    role: str(form, "role") || null,
    title,
    slug,
    prompt,
    type,
    difficulty,
    options: ["mcq", "multi_select", "true_false"].includes(type) ? options : [],
    hint: str(form, "hint") || null,
    day_number: day,
    estimated_minutes: minutes,
    points,
    order_index: order ?? 0,
    is_required: bool(form, "is_required"),
    is_published: bool(form, "is_published"),
  };
  const res = id ? await ctx.supabase.from("practice_questions").update(row).eq("id", id).select("id").single() : await ctx.supabase.from("practice_questions").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "A question with this slug already exists in the course." : res.error.message };
  const qid = res.data.id as string;
  const key = {
    question_id: qid,
    correct_options: ["mcq", "multi_select", "true_false"].includes(type) ? correct.map((c) => c - 1) : [], // stored 0-based
    accepted_answers: ["short_answer", "output_prediction"].includes(type) ? accepted : [],
    explanation: str(form, "explanation") || null,
    solution: str(form, "solution") || null,
  };
  const { error: kErr } = await ctx.supabase.from("practice_answer_keys").upsert(key, { onConflict: "question_id" });
  if (kErr) return { ok: false, error: `Question saved but the answer key failed: ${kErr.message}` };
  await audit(ctx, id ? "question.update" : "question.create", "question", qid, `${id ? "Updated" : "Created"} question “${title}”`, { course_id: courseId, published: row.is_published });
  revalidateLearning();
  return { ok: true, data: { id: qid }, message: id ? "Question saved." : "Question created." };
}

export async function setQuestionState(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  const state = str(form, "state");
  if (!UUID_RE.test(id) || !["publish", "unpublish", "archive", "restore"].includes(state)) return { ok: false, error: "Invalid request." };
  const patch = state === "publish" ? { is_published: true, archived_at: null } : state === "unpublish" ? { is_published: false } : state === "archive" ? { is_published: false, archived_at: new Date().toISOString() } : { archived_at: null };
  const { data, error } = await g.ctx.supabase.from("practice_questions").update(patch).eq("id", id).select("title").single();
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, `question.${state}`, "question", id, `${state[0].toUpperCase() + state.slice(1)}ed question “${data.title}”`);
  revalidateLearning();
  return { ok: true, data: null, message: "Updated." };
}

export async function duplicateQuestion(_prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid question." };
  const s = g.ctx.supabase;
  const [{ data: q }, { data: k }] = await Promise.all([s.from("practice_questions").select("*").eq("id", id).maybeSingle(), s.from("practice_answer_keys").select("*").eq("question_id", id).maybeSingle()]);
  if (!q) return { ok: false, error: "Question not found." };
  const { id: _i, created_at: _c, updated_at: _u, ...rest } = q;
  const { data: copy, error } = await s.from("practice_questions").insert({ ...rest, title: `${q.title} (copy)`, slug: `${q.slug}-copy-${Date.now().toString(36)}`.slice(0, 90), is_published: false, archived_at: null }).select("id").single();
  if (error) return { ok: false, error: error.message };
  if (k) await s.from("practice_answer_keys").insert({ ...k, question_id: copy.id });
  await audit(g.ctx, "question.duplicate", "question", copy.id, `Duplicated question “${q.title}”`, { source: id });
  revalidateLearning();
  return { ok: true, data: { id: copy.id }, message: "Copy created (unpublished)." };
}

/* --------------------------------- Resources --------------------------------- */

export async function saveResource(id: string | null, _prev: unknown, form: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const courseId = str(form, "course_id");
  const title = str(form, "title");
  const type = str(form, "resource_type");
  const source = str(form, "source_kind");
  const url = str(form, "url");
  const order = num(form, "order_index");
  const errs: Record<string, string> = {};
  if (!UUID_RE.test(courseId)) errs.course_id = "Choose a course.";
  if (title.length < 2 || title.length > 200) errs.title = "2–200 characters.";
  if (!RTYPES.includes(type)) errs.resource_type = "Choose a type.";
  const media: Record<string, unknown> = { url: null, file_path: null, drive_file_id: null };
  if (source === "drive") {
    const fid = parseDriveId(url);
    if (!fid) errs.url = "Enter a Google Drive file ID or URL.";
    else media.drive_file_id = fid;
  } else if (source === "storage") {
    if (!/^[\w./-]{3,300}$/.test(url) || url.includes("..")) errs.url = "Enter a Storage path inside the course-resources bucket.";
    else media.file_path = url;
  } else {
    if (!/^https:\/\/\S+$/.test(url)) errs.url = "Enter an https:// link.";
    else media.url = url;
  }
  if (order != null && (Number.isNaN(order) || order < 0)) errs.order_index = "0 or more.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const row = { course_id: courseId, module_id: optUuid(str(form, "module_id")), lesson_id: optUuid(str(form, "lesson_id")), title, description: str(form, "description") || null, resource_type: type, is_downloadable: bool(form, "is_downloadable"), is_published: bool(form, "is_published"), order_index: order ?? 0, ...media };
  const res = id ? await g.ctx.supabase.from("course_resources").update(row).eq("id", id).select("id").single() : await g.ctx.supabase.from("course_resources").insert(row).select("id").single();
  if (res.error) return { ok: false, error: res.error.code === "23505" ? "This Drive file is already a resource in this course." : res.error.message };
  await audit(g.ctx, id ? "resource.update" : "resource.create", "resource", res.data.id, `${id ? "Updated" : "Created"} resource “${title}”`, { course_id: courseId });
  revalidateLearning();
  return { ok: true, data: { id: res.data.id }, message: id ? "Resource saved." : "Resource created." };
}

export async function deleteResource(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const id = str(form, "id");
  if (!UUID_RE.test(id)) return { ok: false, error: "Invalid resource." };
  const { data, error } = await g.ctx.supabase.from("course_resources").delete().eq("id", id).select("title").single();
  if (error) return { ok: false, error: error.message };
  await audit(g.ctx, "resource.delete", "resource", id, `Deleted resource “${data.title}”`);
  revalidateLearning();
  return { ok: true, data: null, message: "Resource deleted." };
}
