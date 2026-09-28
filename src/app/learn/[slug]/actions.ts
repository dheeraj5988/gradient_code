"use server";
import { revalidatePath } from "next/cache";
import { createClient, getUser } from "@/lib/supabase/server";

export async function toggleComplete(lessonId: string, slug: string, done: boolean) {
  const user = await getUser();
  if (!user) return;
  const supabase = await createClient();
  if (done) await supabase.from("lesson_progress").delete().eq("user_id", user.id).eq("lesson_id", lessonId);
  else await supabase.from("lesson_progress").insert({ user_id: user.id, lesson_id: lessonId });
  revalidatePath(`/learn/${slug}`);
}
