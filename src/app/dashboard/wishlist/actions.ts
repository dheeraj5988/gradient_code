"use server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { getCourses } from "@/lib/data/queries";

export type WishlistResult = { ok: true; saved: boolean } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Idempotent: sets the saved state to `desiredSaved`. Identity comes from the session, never the caller. */
export async function setWishlist(courseId: string, desiredSaved: boolean): Promise<WishlistResult> {
  if (typeof courseId !== "string" || !UUID.test(courseId) || typeof desiredSaved !== "boolean") return { ok: false, error: "Invalid request." };
  if (IS_DEMO) return { ok: false, error: "Saving courses is unavailable in demo mode." };
  const user = await getUser();
  if (!user) return { ok: false, error: "Please sign in to save courses." };
  const course = (await getCourses()).find((c) => c.id === courseId);
  if (!course) return { ok: false, error: "That course isn't available." };

  const supabase = await createClient();
  const { error } = desiredSaved
    ? await supabase.from("wishlist").upsert({ user_id: user.id, course_id: courseId }, { onConflict: "user_id,course_id", ignoreDuplicates: true })
    : await supabase.from("wishlist").delete().eq("user_id", user.id).eq("course_id", courseId);
  if (error) return { ok: false, error: "Couldn't update your saved courses. Please try again." };

  revalidatePath("/dashboard/wishlist");
  revalidatePath("/courses");
  revalidatePath(`/courses/${course.slug}`);
  return { ok: true, saved: desiredSaved };
}
