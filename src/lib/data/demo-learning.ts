/**
 * DEMO-ONLY practice, resources and an in-memory learner store.
 * Used only when Supabase env vars are missing (yellow "Demo mode" banner).
 * Answer keys live here, server-side only — never imported by client components.
 */
import "server-only";
import type { AnswerKey, PracticeQuestion, Resource, Topic } from "./learning-types";

const FS = "c-fullstack";
const DS = "c-ds";

export const DEMO_TOPICS: Topic[] = [
  { id: "t-html", course_id: FS, module_id: `${FS}-m0`, name: "HTML", slug: "html", description: "Structure and semantics", order_index: 0 },
  { id: "t-css", course_id: FS, module_id: `${FS}-m1`, name: "CSS", slug: "css", description: "Layout and styling", order_index: 1 },
  { id: "t-js", course_id: FS, module_id: `${FS}-m1`, name: "JavaScript", slug: "javascript", description: "Language fundamentals", order_index: 2 },
  { id: "t-py", course_id: DS, module_id: `${DS}-m0`, name: "Python", slug: "python", description: "Core Python", order_index: 0 },
  { id: "t-pd", course_id: DS, module_id: `${DS}-m1`, name: "Pandas", slug: "pandas", description: "DataFrames", order_index: 1 },
];

type Seed = Omit<PracticeQuestion, "course_id" | "category" | "role" | "module_id" | "lesson_id" | "estimated_minutes" | "points" | "is_required"> & { key: AnswerKey; course_id?: string; category?: "practice" | "interview"; role?: string | null };

const q = (course_id: string, topic_id: string, day: number | null, s: Seed): PracticeQuestion & { key: AnswerKey } => ({
  module_id: DEMO_TOPICS.find((t) => t.id === topic_id)?.module_id ?? null,
  lesson_id: null,
  estimated_minutes: 3,
  points: 10,
  is_required: false,
  category: "practice",
  role: null,
  ...s,
  course_id,
  topic_id,
  day_number: day,
});

const RAW = [
  q(FS, "t-html", 1, { id: "q1", slug: "semantic-nav", title: "Semantic navigation", prompt: "Which element should wrap a site's primary navigation links?", type: "mcq", difficulty: "easy", options: ["<div>", "<nav>", "<section>", "<menu>"], hint: "Think about semantic HTML5 landmarks.", order_index: 0, topic_id: "t-html", day_number: 1, key: { correct_options: [1], accepted_answers: [], explanation: "<nav> is the landmark element for major navigation blocks, which also helps screen readers.", solution: null } }),
  q(FS, "t-html", 1, { id: "q2", slug: "alt-required", title: "Image alt text", prompt: "Decorative images should have an empty alt attribute (alt=\"\").", type: "true_false", difficulty: "easy", options: ["True", "False"], hint: null, order_index: 1, topic_id: "t-html", day_number: 1, key: { correct_options: [0], accepted_answers: [], explanation: "An empty alt tells assistive technology to skip a purely decorative image.", solution: null } }),
  q(FS, "t-css", 1, { id: "q3", slug: "flex-center", title: "Centering with flexbox", prompt: "Select ALL properties needed on a flex container to center a child both horizontally and vertically.", type: "multi_select", difficulty: "medium", options: ["display: flex", "justify-content: center", "align-items: center", "float: center"], hint: "Three of these are correct.", order_index: 2, topic_id: "t-css", day_number: 1, key: { correct_options: [0, 1, 2], accepted_answers: [], explanation: "display:flex creates the flex context; justify-content aligns on the main axis and align-items on the cross axis. float has no 'center' value.", solution: null } }),
  q(FS, "t-js", 2, { id: "q4", slug: "typeof-null", title: "typeof null", prompt: "What does this print?\n\nconsole.log(typeof null);", type: "output_prediction", difficulty: "medium", options: [], hint: "It's a well-known historical quirk.", order_index: 3, topic_id: "t-js", day_number: 2, key: { correct_options: [], accepted_answers: ["object", "\"object\"", "'object'"], explanation: "typeof null returns \"object\" — a bug kept for backward compatibility.", solution: null } }),
  q(FS, "t-js", 2, { id: "q5", slug: "const-reassign", title: "const bindings", prompt: "Which keyword declares a block-scoped variable that cannot be reassigned?", type: "short_answer", difficulty: "easy", options: [], hint: null, order_index: 4, topic_id: "t-js", day_number: 2, key: { correct_options: [], accepted_answers: ["const"], explanation: "const creates a block-scoped binding that can't be reassigned (the value itself may still be mutable).", solution: null } }),
  q(FS, "t-js", 2, { id: "q6", slug: "debounce", title: "Implement debounce", prompt: "Write a debounce(fn, ms) function that delays calling fn until ms milliseconds have passed since the last call.", type: "coding", difficulty: "hard", options: [], hint: "Store the timer id in a closure and clear it on every call.", order_index: 5, topic_id: "t-js", day_number: 2, key: { correct_options: [], accepted_answers: [], explanation: "Keep a timeout id in a closure; clear it on each call and set a new one.", solution: "function debounce(fn, ms) {\n  let t;\n  return (...args) => {\n    clearTimeout(t);\n    t = setTimeout(() => fn(...args), ms);\n  };\n}" } }),
  q(FS, "t-js", null, { id: "i1", slug: "event-loop", title: "Explain the event loop", prompt: "Explain how the JavaScript event loop handles the call stack, microtasks and macrotasks.", type: "scenario", difficulty: "medium", options: [], hint: null, order_index: 0, topic_id: "t-js", day_number: null, category: "interview", role: "Frontend developer", key: { correct_options: [], accepted_answers: [], explanation: null, solution: null } }),
  q(FS, "t-css", null, { id: "i2", slug: "specificity", title: "CSS specificity", prompt: "How does the browser decide which CSS rule wins when several match the same element?", type: "scenario", difficulty: "easy", options: [], hint: null, order_index: 1, topic_id: "t-css", day_number: null, category: "interview", role: "Frontend developer", key: { correct_options: [], accepted_answers: [], explanation: null, solution: null } }),
  q(DS, "t-py", 1, { id: "q7", slug: "list-comp", title: "List comprehension", prompt: "What does [x*x for x in range(3)] evaluate to?", type: "mcq", difficulty: "easy", options: ["[1, 4, 9]", "[0, 1, 4]", "[0, 1, 2]", "[0, 2, 4]"], hint: "range(3) starts at 0.", order_index: 0, topic_id: "t-py", day_number: 1, key: { correct_options: [1], accepted_answers: [], explanation: "range(3) yields 0,1,2 and squaring gives [0, 1, 4].", solution: null } }),
  q(DS, "t-pd", 1, { id: "q8", slug: "df-shape", title: "DataFrame shape", prompt: "Which attribute returns a DataFrame's (rows, columns)?", type: "short_answer", difficulty: "easy", options: [], hint: null, order_index: 1, topic_id: "t-pd", day_number: 1, key: { correct_options: [], accepted_answers: ["shape", "df.shape", ".shape"], explanation: "df.shape returns a (rows, columns) tuple.", solution: null } }),
];

export const DEMO_QUESTIONS: PracticeQuestion[] = RAW.map(({ key: _key, ...rest }) => rest); // eslint-disable-line @typescript-eslint/no-unused-vars
export const DEMO_KEYS = new Map(RAW.map((r) => [r.id, r.key]));

export const DEMO_RESOURCES: Resource[] = [
  { id: "r1", course_id: FS, module_id: `${FS}-m0`, lesson_id: null, title: "HTML & CSS cheat sheet", description: "One-page reference for common tags, selectors and layout properties.", resource_type: "cheat_sheet", url: "https://developer.mozilla.org/en-US/docs/Web/HTML", file_path: null, is_downloadable: false, order_index: 0 },
  { id: "r2", course_id: FS, module_id: `${FS}-m2`, lesson_id: null, title: "Project starter repository", description: "Starter code for the course capstone project.", resource_type: "code_repository", url: "https://github.com/", file_path: null, is_downloadable: false, order_index: 1 },
  { id: "r3", course_id: DS, module_id: null, lesson_id: null, title: "Pandas documentation", description: "Official user guide for DataFrames.", resource_type: "external_link", url: "https://pandas.pydata.org/docs/user_guide/", file_path: null, is_downloadable: false, order_index: 0 },
];

/** In-memory learner state for demo mode (resets on server restart). */
type DemoNote = { id: string; course_id: string; lesson_id: string | null; content: string; video_timestamp_seconds: number | null; created_at: string; updated_at: string };
function createStore() {
  return {
  completed: new Set<string>(),
  video: new Map<string, number>(),
  attempts: [] as { question_id: string; is_correct: boolean | null; answer: unknown; attempt_number: number; submitted_at: string }[],
  saved: new Map<string, string>(),
  notes: [] as DemoNote[],
  plans: new Map<string, { target_date: string; hours_per_day: number }>(),
  reviews: new Map<string, "not_reviewed" | "reviewed" | "confident">(),
  };
}
// Shared across Next.js server layers (RSC render + server actions load modules separately).
const g = globalThis as unknown as { __gcDemoStore?: ReturnType<typeof createStore> };
export const demoStore = (g.__gcDemoStore ??= createStore());
