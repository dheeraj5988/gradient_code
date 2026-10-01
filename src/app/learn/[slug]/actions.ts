"use server";
/**
 * Learner mutations. Each one runs as the signed-in user, so Supabase RLS / RPCs
 * decide what is allowed — these functions only validate input and revalidate UI.
 */
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { DEMO_KEYS, DEMO_QUESTIONS, demoStore } from "@/lib/data/demo-learning";
import type { GradeResult, Note } from "@/lib/data/learning-types";

type Result<T = null> = { ok: true; data: T } | { ok: false; error: string };
const fail = (error: string) => ({ ok: false as const, error });
const ID = /^[0-9a-zA-Z-]{1,64}$/;

async function requireUser() {
  if (IS_DEMO) return "demo";
  const user = await getUser();
  return user?.id ?? null;
}

/* ------------------------------ Lesson progress ------------------------------ */

export async function toggleLessonComplete(slug: string, lessonId: string, currentlyDone: boolean): Promise<Result> {
  if (!ID.test(lessonId)) return fail("Invalid lesson.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) {
    if (currentlyDone) demoStore.completed.delete(lessonId);
    else demoStore.completed.add(lessonId);
  } else {
    const supabase = await createClient();
    const { error } = currentlyDone
      ? await supabase.from("lesson_progress").delete().eq("user_id", uid).eq("lesson_id", lessonId)
      : await supabase.from("lesson_progress").upsert({ user_id: uid, lesson_id: lessonId }, { onConflict: "user_id,lesson_id", ignoreDuplicates: true });
    if (error) return fail("Couldn't update progress. You may not have access to this lesson.");
  }
  revalidatePath(`/learn/${slug}`, "layout");
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

/** Called by the video player at most every ~15s and on pause/end. */
export async function saveVideoProgress(lessonId: string, positionSeconds: number, durationSeconds: number | null): Promise<Result> {
  if (!ID.test(lessonId)) return fail("Invalid lesson.");
  const pos = Math.max(0, Math.floor(Number(positionSeconds) || 0));
  const dur = durationSeconds ? Math.max(0, Math.floor(durationSeconds)) : null;
  const uid = await requireUser();
  if (!uid) return fail("Not signed in.");
  if (IS_DEMO) {
    demoStore.video.set(lessonId, pos);
    return { ok: true, data: null };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("video_progress")
    .upsert({ user_id: uid, lesson_id: lessonId, position_seconds: pos, duration_seconds: dur, updated_at: new Date().toISOString() }, { onConflict: "user_id,lesson_id" });
  return error ? fail("Couldn't save position.") : { ok: true, data: null };
}

/* --------------------------------- Practice --------------------------------- */

export type SubmittedAnswer = { choices?: number[]; text?: string };

export async function submitAnswer(slug: string, questionId: string, answer: SubmittedAnswer, timeSpent?: number): Promise<Result<GradeResult>> {
  if (!ID.test(questionId)) return fail("Invalid question.");
  const clean: SubmittedAnswer = {};
  if (Array.isArray(answer.choices)) clean.choices = answer.choices.filter((n) => Number.isInteger(n) && n >= 0 && n < 20).slice(0, 20);
  if (typeof answer.text === "string") clean.text = answer.text.slice(0, 20000);
  if (!clean.choices?.length && !clean.text?.trim()) return fail("Please provide an answer.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in to submit answers.");

  let result: GradeResult;
  if (IS_DEMO) {
    const q = DEMO_QUESTIONS.find((x) => x.id === questionId);
    const key = DEMO_KEYS.get(questionId);
    if (!q || !key) return fail("Question not found.");
    let ok: boolean | null = null;
    if (["mcq", "multi_select", "true_false"].includes(q.type)) {
      const a = [...new Set(clean.choices ?? [])].sort().join(",");
      ok = a === [...key.correct_options].sort().join(",");
    } else if (["short_answer", "output_prediction"].includes(q.type)) {
      const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();
      ok = key.accepted_answers.some((x) => norm(x) === norm(clean.text ?? ""));
    }
    const n = demoStore.attempts.filter((a) => a.question_id === questionId).length + 1;
    demoStore.attempts.push({ question_id: questionId, is_correct: ok, answer: clean, attempt_number: n, submitted_at: new Date().toISOString() });
    result = { is_correct: ok, attempt_number: n, ...key };
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("submit_practice_answer", { _question_id: questionId, _answer: clean, _time_spent: timeSpent ? Math.min(86400, Math.floor(timeSpent)) : null });
    if (error) return fail(error.message.includes("not_allowed") ? "You don't have access to this question." : "Couldn't submit your answer. Please try again.");
    const row = (data as GradeResult[])[0];
    result = { ...row, correct_options: row.correct_options ?? [], accepted_answers: row.accepted_answers ?? [] };
  }
  // No revalidatePath: the question card shows the result itself; other pages are dynamic and refetch on navigation.
  return { ok: true, data: result };
}

export async function toggleSavedQuestion(slug: string, questionId: string, currentlySaved: boolean): Promise<Result> {
  if (!ID.test(questionId)) return fail("Invalid question.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) {
    if (currentlySaved) demoStore.saved.delete(questionId);
    else demoStore.saved.set(questionId, new Date().toISOString());
  } else {
    const supabase = await createClient();
    const { error } = currentlySaved
      ? await supabase.from("saved_questions").delete().eq("user_id", uid).eq("question_id", questionId)
      : await supabase.from("saved_questions").upsert({ user_id: uid, question_id: questionId }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
    if (error) return fail("Couldn't update saved questions.");
  }
  return { ok: true, data: null }; // optimistic UI already updated; no page refetch
}

export async function setReviewStatus(slug: string, questionId: string, status: "not_reviewed" | "reviewed" | "confident"): Promise<Result> {
  if (!ID.test(questionId) || !["not_reviewed", "reviewed", "confident"].includes(status)) return fail("Invalid input.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) demoStore.reviews.set(questionId, status);
  else {
    const supabase = await createClient();
    const { error } = await supabase.from("question_reviews").upsert({ user_id: uid, question_id: questionId, status, updated_at: new Date().toISOString() }, { onConflict: "user_id,question_id" });
    if (error) return fail("Couldn't save.");
  }
  return { ok: true, data: null }; // optimistic UI already updated; no page refetch
}

/* ----------------------------------- Notes ----------------------------------- */

export async function createNote(slug: string, courseId: string, lessonId: string | null, content: string, timestamp: number | null): Promise<Result<Note>> {
  const text = content.trim();
  if (!text || text.length > 10000) return fail("Notes must be between 1 and 10,000 characters.");
  if (!ID.test(courseId) || (lessonId && !ID.test(lessonId))) return fail("Invalid input.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  const ts = timestamp != null && timestamp >= 0 ? Math.floor(timestamp) : null;
  // The notes list updates on the client from the returned row — no page refetch.
  if (IS_DEMO) {
    const now = new Date().toISOString();
    const note: Note = { id: crypto.randomUUID(), course_id: courseId, lesson_id: lessonId, content: text, video_timestamp_seconds: ts, created_at: now, updated_at: now };
    demoStore.notes.push(note);
    return { ok: true, data: note };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.from("learner_notes").insert({ user_id: uid, course_id: courseId, lesson_id: lessonId, content: text, video_timestamp_seconds: ts }).select("id,course_id,lesson_id,content,video_timestamp_seconds,created_at,updated_at").single();
  if (error || !data) return fail("Couldn't save your note.");
  return { ok: true, data: data as Note };
}

export async function updateNote(slug: string, noteId: string, content: string): Promise<Result> {
  const text = content.trim();
  if (!ID.test(noteId) || !text || text.length > 10000) return fail("Invalid note.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) {
    const n = demoStore.notes.find((x) => x.id === noteId);
    if (n) { n.content = text; n.updated_at = new Date().toISOString(); }
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("learner_notes").update({ content: text }).eq("id", noteId).eq("user_id", uid);
    if (error) return fail("Couldn't update your note.");
  }
  return { ok: true, data: null };
}

export async function deleteNote(slug: string, noteId: string): Promise<Result> {
  if (!ID.test(noteId)) return fail("Invalid note.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) demoStore.notes = demoStore.notes.filter((n) => n.id !== noteId);
  else {
    const supabase = await createClient();
    const { error } = await supabase.from("learner_notes").delete().eq("id", noteId).eq("user_id", uid);
    if (error) return fail("Couldn't delete your note.");
  }
  return { ok: true, data: null };
}

/* ------------------------------- Learning plan ------------------------------- */

export async function savePlan(slug: string, courseId: string, _prev: unknown, form: FormData): Promise<Result> {
  const target = String(form.get("target_date") ?? "");
  const hours = Number(form.get("hours_per_day"));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) return fail("Choose a target date.");
  if (new Date(target + "T23:59:59") < new Date()) return fail("Target date must be today or later.");
  if (!(hours > 0 && hours <= 12)) return fail("Hours per day must be between 0.5 and 12.");
  const uid = await requireUser();
  if (!uid) return fail("Please log in.");
  if (IS_DEMO) demoStore.plans.set(courseId, { target_date: target, hours_per_day: hours });
  else {
    const supabase = await createClient();
    const { error } = await supabase.from("learning_plans").upsert({ user_id: uid, course_id: courseId, target_date: target, hours_per_day: hours, updated_at: new Date().toISOString() }, { onConflict: "user_id,course_id" });
    if (error) return fail("Couldn't save your plan.");
  }
  revalidatePath(`/learn/${slug}`);
  return { ok: true, data: null };
}
