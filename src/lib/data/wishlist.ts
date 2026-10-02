import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { getCourses } from "./queries";
import type { Course } from "./types";

/** Own saved course IDs, newest first. RLS (`own wishlist`) limits rows to the signed-in user. */
async function fetchSavedIds(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("wishlist").select("course_id").eq("user_id", userId).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => r.course_id as string);
}

/** For save markers on cards. A read failure shows cards as not saved rather than breaking the catalog. */
export async function getWishlistIds(userId: string | null): Promise<string[]> {
  if (IS_DEMO || !userId) return [];
  try {
    return await fetchSavedIds(userId);
  } catch {
    return [];
  }
}

/** Saved courses that are still published, newest saved first. Throws on a read error so the page shows an error state. */
export async function getWishlist(userId: string | null): Promise<Course[]> {
  if (IS_DEMO || !userId) return [];
  const [ids, courses] = await Promise.all([fetchSavedIds(userId), getCourses()]);
  const byId = new Map(courses.map((c) => [c.id, c]));
  return ids.flatMap((id) => byId.get(id) ?? []);
}
