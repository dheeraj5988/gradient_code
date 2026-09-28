export type Level = "Beginner" | "Intermediate" | "Advanced" | "All levels";

export type Instructor = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  bio: string;
  avatar_url: string | null;
  linkedin_url: string | null;
  website_url: string | null;
};

export type Course = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string;
  thumbnail_url: string | null;
  track: string;
  level: Level;
  language: string;
  price: number;
  mrp: number | null;
  is_crash_course: boolean;
  is_featured: boolean;
  has_internship: boolean;
  access_policy: "lifetime" | "days";
  access_days: number | null;
  what_you_learn: string[];
  requirements: string[];
  target_audience: string[];
  skills: string[];
  /** Stored in courses.includes (jsonb). projects = number of hands-on projects. */
  includes: { hours?: number; articles?: number; resources?: number; projects?: number; certificate?: boolean };
  rating_avg: number;
  rating_count: number;
  students_count: number;
  instructor: Pick<Instructor, "slug" | "name" | "headline" | "avatar_url"> | null;
  updated_at: string;
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string;
  type: "video" | "text" | "live";
  video_url: string | null;
  content_text: string | null;
  duration_seconds: number;
  order_index: number;
  is_free_preview: boolean;
};

export type Module = {
  id: string;
  title: string;
  order_index: number;
  lessons: Lesson[];
};

export type Review = {
  id: string;
  rating: number;
  body: string;
  author: string;
  created_at: string;
};

export type Internship = {
  id: string;
  slug: string;
  title: string;
  company: string;
  location: string;
  mode: "Remote" | "Hybrid" | "On-site";
  duration_weeks: number;
  stipend_min: number;
  stipend_max: number | null;
  skills: string[];
  description: string;
  responsibilities: string[];
  perks: string[];
  openings: number;
  apply_by: string | null;
  required_course_slug: string | null;
  created_at: string;
};

export type CourseFilters = {
  q?: string;
  track?: string;
  level?: string;
  language?: string;
  price?: "free" | "paid";
  duration?: "short" | "medium" | "long";
  rating?: "4" | "4.5";
  certificate?: "1";
  internship?: "1";
  projects?: "1";
  format?: "short";
  sort?: "popular" | "rating" | "newest" | "price-low" | "price-high";
};
