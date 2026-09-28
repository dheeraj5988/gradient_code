import { getMyCourses } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { ProgressCard } from "../progress-card";

export const metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const user = await getUser();
  const courses = await getMyCourses(user?.id ?? null);
  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">My courses</h1>
      {/* TODO(antigravity): tabs — In progress / Completed / Wishlist */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{courses.map((c) => <ProgressCard key={c.id} c={c} />)}</div>
    </div>
  );
}
