import { BookOpen } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getMyCourses } from "@/lib/data/queries";
import { getResumeTargets } from "@/lib/data/learning";
import { getUser } from "@/lib/supabase/server";
import { ProgressCard } from "../progress-card";

export const metadata = { title: "My courses" };

export default async function MyCoursesPage() {
  const user = await getUser();
  const courses = await getMyCourses(user?.id ?? null);
  const targets = await getResumeTargets(user?.id ?? null, courses);
  const resumeFor = (id: string) => {
    const t = targets.find((x) => x.course.id === id);
    return t ? { href: `/learn/${t.course.slug}/lesson/${t.lessonId}`, label: `${t.updatedAt ? "Resume" : "Next"}: ${t.lessonTitle}` } : undefined;
  };
  const groups = [
    { title: "In progress", list: courses.filter((c) => c.progress > 0 && c.progress < 100) },
    { title: "Not started", list: courses.filter((c) => c.progress === 0) },
    { title: "Completed", list: courses.filter((c) => c.progress === 100) },
  ].filter((g) => g.list.length);
  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-bold sm:text-3xl">My courses</h1>
      {groups.length ? (
        groups.map((g) => (
          <section key={g.title} className="mt-8">
            <h2 className="mb-4 text-lg font-semibold">{g.title} <span className="text-sm font-normal text-muted-foreground">({g.list.length})</span></h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{g.list.map((c) => <ProgressCard key={c.id} c={c} resume={resumeFor(c.id)} />)}</div>
          </section>
        ))
      ) : (
        <EmptyState className="mt-8" icon={BookOpen} title="No courses yet" description="Courses you enroll in will appear here." action={<ButtonLink href="/courses" size="sm">Explore courses</ButtonLink>} />
      )}
    </div>
  );
}
