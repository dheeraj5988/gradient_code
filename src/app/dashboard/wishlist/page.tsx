import { Heart } from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getWishlist } from "@/lib/data/wishlist";
import { IS_DEMO } from "@/lib/supabase/env";
import { getUser } from "@/lib/supabase/server";

export const metadata = { title: "Saved courses" };

export default async function WishlistPage() {
  const user = await getUser();
  const courses = await getWishlist(user?.id ?? null);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">Saved courses</h1>
      {courses.length ? (
        <>
          <p className="mt-1 text-sm text-muted-foreground">{courses.length} saved {courses.length === 1 ? "course" : "courses"}</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {courses.map((c) => <CourseCard key={c.id} course={c} showWishlist signedIn saved refreshOnChange />)}
          </div>
        </>
      ) : (
        <EmptyState
          className="mt-8"
          icon={Heart}
          title="Save courses to find them here later"
          description={IS_DEMO ? "Demo mode: saved courses aren't stored." : "Tap the heart on any course to save it."}
          action={<ButtonLink href="/courses" size="sm">Browse courses</ButtonLink>}
        />
      )}
    </div>
  );
}
