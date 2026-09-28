import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { DEMO_COURSES, DEMO_INSTRUCTORS, DEMO_INTERNSHIPS, DEMO_REVIEWS, demoCurriculum } from "./demo";
import type { Course, CourseFilters, Instructor, Internship, Module, Review } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapCourse(row: any): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    subtitle: row.subtitle ?? null,
    description: row.description ?? "",
    thumbnail_url: row.thumbnail_url ?? null,
    track: row.track ?? "General",
    level: row.level ?? "All levels",
    language: row.language ?? "Hinglish",
    price: Number(row.price ?? 0),
    mrp: row.mrp != null ? Number(row.mrp) : null,
    is_crash_course: !!row.is_crash_course,
    is_featured: !!row.is_featured,
    has_internship: !!row.has_internship,
    access_policy: row.access_policy ?? "lifetime",
    access_days: row.access_days ?? null,
    what_you_learn: row.what_you_learn ?? [],
    requirements: row.requirements ?? [],
    target_audience: row.target_audience ?? [],
    skills: row.skills ?? [],
    includes: row.includes ?? {},
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: row.rating_count ?? 0,
    students_count: row.students_count ?? 0,
    instructor: row.instructor
      ? row.instructor
      : row.instructor_name
        ? { slug: "", name: row.instructor_name, headline: null, avatar_url: null }
        : null,
    updated_at: row.updated_at ?? row.created_at,
  };
}

function applyFilters(list: Course[], f: CourseFilters) {
  let out = list;
  if (f.q) {
    const q = f.q.toLowerCase();
    out = out.filter((c) =>
      [c.title, c.subtitle, c.track, ...c.skills].join(" ").toLowerCase().includes(q),
    );
  }
  if (f.track) out = out.filter((c) => c.track === f.track);
  if (f.level) out = out.filter((c) => c.level === f.level);
  if (f.price === "free") out = out.filter((c) => c.price === 0);
  if (f.price === "paid") out = out.filter((c) => c.price > 0);
  const sorters: Record<string, (a: Course, b: Course) => number> = {
    popular: (a, b) => b.students_count - a.students_count || Number(b.is_featured) - Number(a.is_featured),
    rating: (a, b) => b.rating_avg - a.rating_avg,
    newest: (a, b) => b.updated_at.localeCompare(a.updated_at),
    "price-low": (a, b) => a.price - b.price,
    "price-high": (a, b) => b.price - a.price,
  };
  return [...out].sort(sorters[f.sort ?? "popular"]);
}

const COURSE_SELECT = "*, instructor:instructors(slug,name,headline,avatar_url)";

async function allPublishedCourses(): Promise<Course[]> {
  if (IS_DEMO) return DEMO_COURSES;
  const supabase = await createClient();
  let { data, error } = await supabase.from("courses").select(COURSE_SELECT).eq("is_published", true);
  if (error) {
    // Marketplace migration not applied yet — fall back to the plain table.
    ({ data, error } = await supabase.from("courses").select("*").eq("is_published", true));
  }
  if (error) throw error;
  return (data ?? []).map(mapCourse);
}

export async function getCourses(filters: CourseFilters = {}) {
  return applyFilters(await allPublishedCourses(), filters);
}

export async function getFeaturedCourses(limit = 6) {
  const all = await allPublishedCourses();
  return [...all].sort((a, b) => Number(b.is_featured) - Number(a.is_featured)).slice(0, limit);
}

export async function getTracks() {
  const all = await allPublishedCourses();
  const counts = new Map<string, number>();
  all.forEach((c) => counts.set(c.track, (counts.get(c.track) ?? 0) + 1));
  return [...counts.entries()].map(([name, count]) => ({ name, count }));
}

export async function getCourseBySlug(slug: string): Promise<Course | null> {
  if (IS_DEMO) return DEMO_COURSES.find((c) => c.slug === slug) ?? null;
  const all = await allPublishedCourses();
  return all.find((c) => c.slug === slug) ?? null;
}

export async function getCurriculum(courseId: string): Promise<Module[]> {
  if (IS_DEMO) return demoCurriculum(courseId);
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("course_modules").select("id,title,order_index").eq("course_id", courseId).order("order_index");
  const ids = (modules ?? []).map((m) => m.id);
  if (!ids.length) return [];
  // Public listing: never expose video_url here — the player fetches it after an enrollment check.
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id,module_id,title,type,duration_seconds,order_index,is_free_preview")
    .in("module_id", ids)
    .order("order_index");
  return (modules ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({ ...l, video_url: null, content_text: null })),
  })) as Module[];
}

export async function getReviews(courseId: string): Promise<Review[]> {
  if (IS_DEMO) return DEMO_REVIEWS;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select("id,rating,body,created_at,user_id")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  // TODO(antigravity): join profiles for author names via a public view.
  return data.map((r) => ({ id: r.id, rating: r.rating, body: r.body, created_at: r.created_at, author: "Verified learner" }));
}

export async function getInstructor(slug: string) {
  if (IS_DEMO) {
    const inst = DEMO_INSTRUCTORS.find((i) => i.slug === slug) ?? null;
    return inst ? { instructor: inst, courses: DEMO_COURSES.filter((c) => c.instructor?.slug === slug) } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase.from("instructors").select("*").eq("slug", slug).maybeSingle();
  if (!data) return null;
  const courses = (await allPublishedCourses()).filter((c) => c.instructor?.slug === slug);
  return { instructor: data as Instructor, courses };
}

function mapInternship(row: any): Internship {
  return { ...row, required_course_slug: row.required_course?.slug ?? null };
}

export async function getInternships(f: { q?: string; mode?: string } = {}): Promise<Internship[]> {
  let list: Internship[];
  if (IS_DEMO) list = DEMO_INTERNSHIPS;
  else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("internships")
      .select("*, required_course:courses(slug)")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    list = (data ?? []).map(mapInternship);
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    list = list.filter((i) => [i.title, i.company, ...i.skills].join(" ").toLowerCase().includes(q));
  }
  if (f.mode) list = list.filter((i) => i.mode === f.mode);
  return list;
}

export async function getInternship(slug: string) {
  return (await getInternships()).find((i) => i.slug === slug) ?? null;
}

/* ---------- Authenticated learner data ---------- */

export type MyCourse = Course & { progress: number; total: number; completed: number };

export async function getMyCourses(userId: string | null): Promise<MyCourse[]> {
  if (IS_DEMO || !userId) {
    return DEMO_COURSES.slice(0, 3).map((c, i) => ({ ...c, total: 16, completed: [11, 4, 0][i], progress: [69, 25, 0][i] }));
  }
  const supabase = await createClient();
  const { data: enr } = await supabase
    .from("enrollments").select("course_id, expires_at").eq("user_id", userId);
  const ids = (enr ?? [])
    .filter((e) => !e.expires_at || new Date(e.expires_at) > new Date())
    .map((e) => e.course_id);
  if (!ids.length) return [];
  const { data: rows } = await supabase.from("courses").select("*").in("id", ids);
  const { data: mods } = await supabase.from("course_modules").select("id,course_id").in("course_id", ids);
  const modIds = (mods ?? []).map((m) => m.id);
  const { data: lessons } = modIds.length
    ? await supabase.from("lessons").select("id,module_id").in("module_id", modIds)
    : { data: [] as { id: string; module_id: string }[] };
  const { data: done } = await supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId);
  const doneSet = new Set((done ?? []).map((d) => d.lesson_id));
  return (rows ?? []).map((r) => {
    const courseMods = new Set((mods ?? []).filter((m) => m.course_id === r.id).map((m) => m.id));
    const ls = (lessons ?? []).filter((l) => courseMods.has(l.module_id));
    const completed = ls.filter((l) => doneSet.has(l.id)).length;
    return { ...mapCourse(r), total: ls.length, completed, progress: ls.length ? Math.round((completed / ls.length) * 100) : 0 };
  });
}

export async function isEnrolled(userId: string | null, courseId: string) {
  if (IS_DEMO) return true;
  if (!userId) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments").select("expires_at").eq("user_id", userId).eq("course_id", courseId).maybeSingle();
  return !!data && (!data.expires_at || new Date(data.expires_at) > new Date());
}

/** Full curriculum incl. video URLs — call only after isEnrolled() is true. */
export async function getPlayerCurriculum(courseId: string, userId: string | null) {
  if (IS_DEMO) return { modules: demoCurriculum(courseId), completed: new Set<string>() };
  const supabase = await createClient();
  const { data: modules } = await supabase
    .from("course_modules").select("id,title,order_index").eq("course_id", courseId).order("order_index");
  const ids = (modules ?? []).map((m) => m.id);
  const { data: lessons } = ids.length
    ? await supabase.from("lessons").select("*").in("module_id", ids).order("order_index")
    : { data: [] };
  const { data: done } = userId
    ? await supabase.from("lesson_progress").select("lesson_id").eq("user_id", userId)
    : { data: [] };
  return {
    modules: (modules ?? []).map((m) => ({ ...m, lessons: (lessons ?? []).filter((l: any) => l.module_id === m.id) })) as Module[],
    completed: new Set((done ?? []).map((d: any) => d.lesson_id as string)),
  };
}
