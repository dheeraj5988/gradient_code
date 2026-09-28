/**
 * Learning portal data layer (server-only).
 * Access rules are enforced in the DATABASE (RLS + SECURITY DEFINER RPCs, see
 * supabase/migrations/20260929090000_learning_portal_practice.sql). This module
 * only shapes data; it never widens access.
 */
import "server-only";
import { cache } from "react";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { demoCurriculum } from "./demo";
import { DEMO_KEYS, DEMO_QUESTIONS, DEMO_RESOURCES, DEMO_TOPICS, demoStore } from "./demo-learning";
import { getCourseBySlug } from "./queries";
import type { Course, Lesson, Module } from "./types";
import type { AnswerKey, Note, PracticeQuestion, QuestionState, Resource, Topic } from "./learning-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export type OutlineLesson = Pick<Lesson, "id" | "module_id" | "title" | "type" | "duration_seconds" | "order_index" | "is_free_preview">;
export type OutlineModule = { id: string; title: string; order_index: number; lessons: OutlineLesson[] };
export type Access = "enrolled" | "preview";

export type ModuleProgress = { id: string; title: string; total: number; completed: number; percent: number };

export type LearningContext = {
  course: Course;
  userId: string | null;
  access: Access;
  modules: OutlineModule[];
  lessons: OutlineLesson[];
  completed: Set<string>;
  progress: { total: number; completed: number; percent: number; modules: ModuleProgress[] };
  nextLesson: OutlineLesson | null;
};

const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

/** Public, safe curriculum outline (no media URLs / text). */
export const getOutline = cache(async (courseId: string): Promise<OutlineModule[]> => {
  if (IS_DEMO) return demoCurriculum(courseId).map(({ lessons, ...m }) => ({ ...m, lessons: lessons.map(stripLesson) }));
  const supabase = await createClient();
  const [{ data: modules }, { data: outline, error }] = await Promise.all([
    supabase.from("course_modules").select("id,title,order_index").eq("course_id", courseId).order("order_index"),
    supabase.rpc("course_outline", { _course_id: courseId }),
  ]);
  if (error) throw error;
  const rows = (outline ?? []) as OutlineLesson[];
  return (modules ?? []).map((m) => ({ ...m, lessons: rows.filter((l) => l.module_id === m.id) }));
});

function stripLesson(l: Lesson): OutlineLesson {
  return { id: l.id, module_id: l.module_id, title: l.title, type: l.type, duration_seconds: l.duration_seconds, order_index: l.order_index, is_free_preview: l.is_free_preview };
}

export const hasCourseAccess = cache(async (courseId: string, userId: string | null) => {
  if (IS_DEMO) return true;
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase.rpc("can_access_course", { _course_id: courseId });
  return Boolean(data);
});

export const getCompletedLessons = cache(async (userId: string | null, lessonIds: string[]) => {
  if (IS_DEMO) return new Set([...demoStore.completed].filter((id) => lessonIds.includes(id)));
  if (!userId || !lessonIds.length) return new Set<string>();
  const supabase = await createClient();
  const { data } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId).in("lesson_id", lessonIds);
  return new Set((data ?? []).map((r) => r.lesson_id as string));
});

export function computeProgress(modules: OutlineModule[], completed: Set<string>) {
  const mods = modules.map((m) => {
    const done = m.lessons.filter((l) => completed.has(l.id)).length;
    return { id: m.id, title: m.title, total: m.lessons.length, completed: done, percent: pct(done, m.lessons.length) };
  });
  const total = mods.reduce((s, m) => s + m.total, 0);
  const done = mods.reduce((s, m) => s + m.completed, 0);
  return { total, completed: done, percent: pct(done, total), modules: mods };
}

/** Everything the portal layout + pages need. Deduplicated per request via cache(). */
export const getLearningContext = cache(async (slug: string): Promise<LearningContext | null> => {
  const course = await getCourseBySlug(slug);
  if (!course) return null;
  const user = await getUser();
  const userId = IS_DEMO ? "demo" : (user?.id ?? null);
  const [modules, enrolled] = await Promise.all([getOutline(course.id), hasCourseAccess(course.id, userId)]);
  const lessons = modules.flatMap((m) => m.lessons);
  const completed = enrolled ? await getCompletedLessons(userId, lessons.map((l) => l.id)) : new Set<string>();
  return {
    course,
    userId,
    access: enrolled ? "enrolled" : "preview",
    modules,
    lessons,
    completed,
    progress: computeProgress(modules, completed),
    nextLesson: lessons.find((l) => !completed.has(l.id)) ?? null,
  };
});

/** Protected lesson content — database decides (enrolled / admin / free preview). */
export const getLessonContent = cache(async (lessonId: string) => {
  if (IS_DEMO) return { video_url: null as string | null, content_text: null as string | null, join_url: null as string | null };
  const supabase = await createClient();
  const { data } = await supabase.rpc("lesson_content", { _lesson_id: lessonId });
  const row = (data as any[] | null)?.[0];
  return row ? { video_url: row.video_url as string | null, content_text: row.content_text as string | null, join_url: row.join_url as string | null } : null;
});

export async function getVideoPosition(userId: string | null, lessonId: string) {
  if (IS_DEMO) return demoStore.video.get(lessonId) ?? 0;
  if (!userId) return 0;
  const supabase = await createClient();
  const { data } = await supabase.from("video_progress").select("position_seconds").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  return data?.position_seconds ?? 0;
}

/* ---------------------------------- Practice ---------------------------------- */

export type QuestionWithState = PracticeQuestion & { state: QuestionState; attempts: number; saved: boolean; savedAt: string | null; lastAttemptAt: string | null };

export type PracticeData = {
  topics: Topic[];
  questions: QuestionWithState[];
  stats: {
    total: number;
    solved: number;
    attempted: number;
    incorrect: number;
    pending: number;
    saved: number;
    percent: number;
    byDifficulty: Record<"easy" | "medium" | "hard", { total: number; solved: number }>;
    byTopic: { topic: Topic; total: number; solved: number }[];
  };
  recent: { question: QuestionWithState; is_correct: boolean | null; submitted_at: string }[];
};

function stateFrom(attempts: { is_correct: boolean | null }[]): QuestionState {
  if (!attempts.length) return "not_started";
  if (attempts.some((a) => a.is_correct === true)) return "correct";
  if (attempts.every((a) => a.is_correct === null)) return "pending_review";
  return "incorrect";
}

/** One batched read: topics + questions + this learner's attempts + saved. */
export const getPractice = cache(async (courseId: string, userId: string | null, category: "practice" | "interview" = "practice"): Promise<PracticeData> => {
  let topics: Topic[];
  let questions: PracticeQuestion[];
  let attempts: { question_id: string; is_correct: boolean | null; submitted_at: string }[];
  let saved: Map<string, string>;

  if (IS_DEMO) {
    topics = DEMO_TOPICS.filter((t) => t.course_id === courseId);
    questions = DEMO_QUESTIONS.filter((q) => q.course_id === courseId && q.category === category);
    attempts = demoStore.attempts;
    saved = demoStore.saved;
  } else {
    const supabase = await createClient();
    const [t, q] = await Promise.all([
      supabase.from("course_topics").select("id,course_id,module_id,name,slug,description,order_index").eq("course_id", courseId).order("order_index"),
      supabase
        .from("practice_questions")
        .select("id,course_id,module_id,topic_id,lesson_id,category,role,title,slug,prompt,type,difficulty,options,hint,day_number,estimated_minutes,points,order_index,is_required")
        .eq("course_id", courseId)
        .eq("category", category)
        .eq("is_published", true)
        .order("order_index"),
    ]);
    topics = (t.data ?? []) as Topic[];
    questions = (q.data ?? []) as PracticeQuestion[];
    const ids = questions.map((x) => x.id);
    if (userId && ids.length) {
      const [a, s] = await Promise.all([
        supabase.from("question_attempts").select("question_id,is_correct,submitted_at").eq("user_id", userId).in("question_id", ids).order("submitted_at", { ascending: false }),
        supabase.from("saved_questions").select("question_id,created_at").eq("user_id", userId).in("question_id", ids),
      ]);
      attempts = (a.data ?? []) as typeof attempts;
      saved = new Map((s.data ?? []).map((r) => [r.question_id as string, r.created_at as string]));
    } else {
      attempts = [];
      saved = new Map();
    }
  }

  const byQ = new Map<string, typeof attempts>();
  attempts.forEach((a) => byQ.set(a.question_id, [...(byQ.get(a.question_id) ?? []), a]));
  const withState: QuestionWithState[] = questions.map((q) => {
    const list = byQ.get(q.id) ?? [];
    return { ...q, state: stateFrom(list), attempts: list.length, saved: saved.has(q.id), savedAt: saved.get(q.id) ?? null, lastAttemptAt: list[0]?.submitted_at ?? null };
  });

  const diff = { easy: { total: 0, solved: 0 }, medium: { total: 0, solved: 0 }, hard: { total: 0, solved: 0 } };
  withState.forEach((q) => { diff[q.difficulty].total++; if (q.state === "correct") diff[q.difficulty].solved++; });
  const solved = withState.filter((q) => q.state === "correct").length;
  const recent = attempts
    .filter((a) => withState.some((q) => q.id === a.question_id))
    .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))
    .slice(0, 5)
    .map((a) => ({ question: withState.find((q) => q.id === a.question_id)!, is_correct: a.is_correct, submitted_at: a.submitted_at }));

  return {
    topics,
    questions: withState,
    stats: {
      total: withState.length,
      solved,
      attempted: withState.filter((q) => q.state !== "not_started").length,
      incorrect: withState.filter((q) => q.state === "incorrect").length,
      pending: withState.filter((q) => q.state === "pending_review").length,
      saved: withState.filter((q) => q.saved).length,
      percent: pct(solved, withState.length),
      byDifficulty: diff,
      byTopic: topics
        .map((topic) => {
          const qs = withState.filter((q) => q.topic_id === topic.id);
          return { topic, total: qs.length, solved: qs.filter((q) => q.state === "correct").length };
        })
        .filter((t) => t.total > 0),
    },
    recent,
  };
});

/** Answer key for review — only returned by the DB if the learner has already attempted. */
export async function getReview(questionId: string): Promise<AnswerKey | null> {
  if (IS_DEMO) return demoStore.attempts.some((a) => a.question_id === questionId) ? (DEMO_KEYS.get(questionId) ?? null) : null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("practice_review", { _question_id: questionId });
  return ((data as AnswerKey[] | null)?.[0]) ?? null;
}

export async function getLastAnswer(userId: string | null, questionId: string): Promise<unknown> {
  if (IS_DEMO) return [...demoStore.attempts].reverse().find((a) => a.question_id === questionId)?.answer ?? null;
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("question_attempts").select("answer").eq("user_id", userId).eq("question_id", questionId).order("attempt_number", { ascending: false }).limit(1).maybeSingle();
  return data?.answer ?? null;
}

/** Practice summary for several courses at once (dashboard). Courses without a question bank are omitted. */
export async function getPracticeSummaries(userId: string | null, courseIds: string[]) {
  const out = new Map<string, { total: number; solved: number }>();
  if (!courseIds.length) return out;
  let qs: { id: string; course_id: string }[];
  let correct: Set<string>;
  if (IS_DEMO) {
    qs = DEMO_QUESTIONS.filter((q) => q.category === "practice" && courseIds.includes(q.course_id));
    correct = new Set(demoStore.attempts.filter((a) => a.is_correct).map((a) => a.question_id));
  } else {
    const supabase = await createClient();
    const { data } = await supabase.from("practice_questions").select("id,course_id").in("course_id", courseIds).eq("category", "practice").eq("is_published", true);
    qs = data ?? [];
    if (userId && qs.length) {
      const { data: a } = await supabase.from("question_attempts").select("question_id").eq("user_id", userId).eq("is_correct", true).in("question_id", qs.map((q) => q.id));
      correct = new Set((a ?? []).map((r) => r.question_id as string));
    } else correct = new Set();
  }
  qs.forEach((q) => {
    const cur = out.get(q.course_id) ?? { total: 0, solved: 0 };
    cur.total++;
    if (correct.has(q.id)) cur.solved++;
    out.set(q.course_id, cur);
  });
  return out;
}

export async function getReviewStatuses(userId: string | null, questionIds: string[]) {
  if (IS_DEMO) return new Map(questionIds.map((id) => [id, demoStore.reviews.get(id) ?? "not_reviewed"]));
  const m = new Map<string, string>();
  if (!userId || !questionIds.length) return m;
  const supabase = await createClient();
  const { data } = await supabase.from("question_reviews").select("question_id,status").eq("user_id", userId).in("question_id", questionIds);
  (data ?? []).forEach((r) => m.set(r.question_id, r.status));
  return m;
}

/* ---------------------------------- Resources & notes ---------------------------------- */

export async function getResources(courseId: string): Promise<Resource[]> {
  if (IS_DEMO) return DEMO_RESOURCES.filter((r) => r.course_id === courseId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_resources")
    .select("id,course_id,module_id,lesson_id,title,description,resource_type,url,file_path,is_downloadable,order_index")
    .eq("course_id", courseId)
    .eq("is_published", true)
    .order("order_index");
  if (error) throw error;
  return (data ?? []) as Resource[];
}

/** Short-lived signed URL for a private Storage file (RLS on course_resources already checked access). */
export async function resourceHref(r: Resource): Promise<string | null> {
  if (r.url) return r.url;
  if (!r.file_path || IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("course-resources").createSignedUrl(r.file_path, 60 * 10, r.is_downloadable ? { download: true } : undefined);
  return data?.signedUrl ?? null;
}

export async function getNotes(userId: string | null, courseId: string, opts: { lessonId?: string; q?: string } = {}): Promise<Note[]> {
  let list: Note[];
  if (IS_DEMO) list = demoStore.notes.filter((n) => n.course_id === courseId);
  else {
    if (!userId) return [];
    const supabase = await createClient();
    let query = supabase.from("learner_notes").select("id,course_id,lesson_id,content,video_timestamp_seconds,created_at,updated_at").eq("user_id", userId).eq("course_id", courseId).order("created_at", { ascending: false }).limit(200);
    if (opts.lessonId) query = query.eq("lesson_id", opts.lessonId);
    if (opts.q) query = query.ilike("content", `%${opts.q.replace(/[%_]/g, "")}%`);
    const { data } = await query;
    return (data ?? []) as Note[];
  }
  if (opts.lessonId) list = list.filter((n) => n.lesson_id === opts.lessonId);
  if (opts.q) list = list.filter((n) => n.content.toLowerCase().includes(opts.q!.toLowerCase()));
  return [...list].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getPlan(userId: string | null, courseId: string) {
  if (IS_DEMO) return demoStore.plans.get(courseId) ?? null;
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("learning_plans").select("target_date,hours_per_day").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  return data ? { target_date: data.target_date as string, hours_per_day: Number(data.hours_per_day) } : null;
}

/* ---------------------------------- Rules-based plan ---------------------------------- */

export type PlanDay = { date: string; lessons: OutlineLesson[]; questions: number; minutes: number };

/**
 * Deterministic planner: spreads remaining lessons (by real duration) and
 * remaining practice (by estimated minutes) across days until the target date,
 * capped by the learner's daily time budget. Recomputed on every request, so it
 * follows actual progress automatically.
 */
export function buildPlan(opts: { remainingLessons: OutlineLesson[]; remainingQuestions: PracticeQuestion[]; targetDate: string; hoursPerDay: number; today?: Date }): { days: PlanDay[]; onTrack: boolean; daysLeft: number } {
  const today = opts.today ?? new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const end = new Date(opts.targetDate + "T00:00:00Z");
  const daysLeft = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const budget = Math.round(opts.hoursPerDay * 60);
  const lessonMin = (l: OutlineLesson) => Math.max(5, Math.ceil((l.duration_seconds || 600) / 60));
  const totalMinutes = opts.remainingLessons.reduce((s, l) => s + lessonMin(l), 0) + opts.remainingQuestions.reduce((s, q) => s + q.estimated_minutes, 0);
  const perDay = Math.min(budget, Math.max(15, Math.ceil(totalMinutes / daysLeft)));

  const days: PlanDay[] = [];
  const lessons = [...opts.remainingLessons];
  const questions = [...opts.remainingQuestions];
  for (let d = 0; (lessons.length || questions.length) && d < 60; d++) {
    const date = new Date(start.getTime() + d * 86400000).toISOString().slice(0, 10);
    const day: PlanDay = { date, lessons: [], questions: 0, minutes: 0 };
    // Lessons first (at least one per day if any remain), then practice fills the rest.
    while (lessons.length && (day.lessons.length === 0 || day.minutes + lessonMin(lessons[0]) <= perDay * 0.7)) {
      const l = lessons.shift()!;
      day.lessons.push(l);
      day.minutes += lessonMin(l);
    }
    while (questions.length && (day.minutes + questions[0].estimated_minutes <= perDay || day.questions === 0 && !day.lessons.length)) {
      day.minutes += questions.shift()!.estimated_minutes;
      day.questions++;
    }
    days.push(day);
  }
  return { days, onTrack: totalMinutes <= budget * daysLeft, daysLeft };
}

/** Next unfinished lesson for several enrolled courses (dashboard "Up next"). Batched: 1 outline RPC per course + 1 progress query. */
export async function getNextLessons(userId: string | null, courses: { id: string; slug: string; title: string; progress: number }[]) {
  const active = courses.filter((c) => c.progress < 100).slice(0, 4);
  const outlines = await Promise.all(active.map((c) => getOutline(c.id)));
  const allIds = outlines.flatMap((o) => o.flatMap((m) => m.lessons.map((l) => l.id)));
  const done = await getCompletedLessons(userId, allIds);
  return active.flatMap((c, i) => {
    const next = outlines[i].flatMap((m) => m.lessons).find((l) => !done.has(l.id));
    return next ? [{ course: c, lessonId: next.id, lessonTitle: next.title, duration: next.duration_seconds }] : [];
  });
}
