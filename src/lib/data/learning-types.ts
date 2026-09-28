export type Difficulty = "easy" | "medium" | "hard";
export type QuestionType = "mcq" | "multi_select" | "true_false" | "short_answer" | "coding" | "debugging" | "output_prediction" | "scenario";

export type Topic = { id: string; course_id: string; module_id: string | null; name: string; slug: string; description: string | null; order_index: number };

/** Student-safe question (no answers). */
export type PracticeQuestion = {
  id: string;
  course_id: string;
  module_id: string | null;
  topic_id: string | null;
  lesson_id: string | null;
  category: "practice" | "interview";
  role: string | null;
  title: string;
  slug: string;
  prompt: string;
  type: QuestionType;
  difficulty: Difficulty;
  options: string[];
  hint: string | null;
  day_number: number | null;
  estimated_minutes: number;
  points: number;
  order_index: number;
  is_required: boolean;
};

export type AnswerKey = { correct_options: number[]; accepted_answers: string[]; explanation: string | null; solution: string | null };

export type QuestionState = "not_started" | "attempted" | "incorrect" | "correct" | "pending_review";

export type GradeResult = { is_correct: boolean | null; attempt_number: number } & AnswerKey;

export type Resource = {
  id: string;
  course_id: string;
  module_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  resource_type: "pdf" | "notes" | "cheat_sheet" | "external_link" | "code_repository" | "dataset" | "template" | "presentation" | "recording";
  url: string | null;
  file_path: string | null;
  drive_file_id?: string | null;
  is_downloadable: boolean;
  order_index: number;
};

export type Note = { id: string; course_id: string; lesson_id: string | null; content: string; video_timestamp_seconds: number | null; created_at: string; updated_at: string };

export const AUTO_GRADED: QuestionType[] = ["mcq", "multi_select", "true_false", "short_answer", "output_prediction"];
