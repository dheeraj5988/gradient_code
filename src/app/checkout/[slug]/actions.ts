"use server";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

/** Free courses only. The enroll_free() RPC re-checks price & publish status in the database. */
export async function enrollFree(courseId: string, slug: string) {
  if (IS_DEMO) redirect(`/learn/${slug}`);
  const user = await getUser();
  if (!user) redirect(`/login?next=/checkout/${slug}`);
  const supabase = await createClient();
  const { error } = await supabase.rpc("enroll_free", { _course_id: courseId });
  if (error) redirect(`/checkout/${slug}?error=${encodeURIComponent(error.message.includes("course_not_free") ? "This course is not free." : "Enrollment failed. Please try again.")}`);
  redirect(`/learn/${slug}`);
}
