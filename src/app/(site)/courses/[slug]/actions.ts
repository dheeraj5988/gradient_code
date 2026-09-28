"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export async function toggleWishlist(courseId: string, slug: string, saved: boolean) {
  if (IS_DEMO) return;
  const user = await getUser();
  if (!user) redirect(`/login?next=/courses/${slug}`);
  const supabase = await createClient();
  if (saved) await supabase.from("wishlist").delete().eq("user_id", user.id).eq("course_id", courseId);
  else await supabase.from("wishlist").insert({ user_id: user.id, course_id: courseId });
  revalidatePath(`/courses/${slug}`);
}
