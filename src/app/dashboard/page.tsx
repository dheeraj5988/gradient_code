import Link from "next/link";
import { Award, BookOpen, Flame, PlayCircle } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { getMyCourses } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { ProgressCard } from "./progress-card";

export const metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await getUser();
  const courses = await getMyCourses(user?.id ?? null);
  const resume = courses.find((c) => c.progress > 0 && c.progress < 100) ?? courses[0];
  const done = courses.filter((c) => c.progress === 100).length;
  const first = ((user?.user_metadata?.full_name as string) || "there").split(" ")[0];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {first} 👋</h1>
        <p className="text-muted-foreground">Pick up where you left off.</p>
      </div>

      {resume ? (
        <div className="gradient-border-static flex flex-col gap-5 rounded-3xl bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Continue learning</p>
            <h2 className="mt-1 text-xl font-bold">{resume.title}</h2>
            <p className="text-sm text-muted-foreground">{resume.progress}% complete</p>
          </div>
          <ButtonLink href={`/learn/${resume.slug}`}><PlayCircle className="h-4 w-4" />Resume</ButtonLink>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: BookOpen, label: "Enrolled courses", value: courses.length },
          { icon: Award, label: "Completed", value: done },
          { icon: Flame, label: "Day streak", value: "—" }, // TODO(antigravity): compute from activity_log
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5">
            <s.icon className="h-5 w-5 text-brand-pink" />
            <p className="mt-3 text-2xl font-bold">{s.value}</p>
            <p className="text-sm text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">My courses</h2>
          <Link href="/dashboard/courses" className="text-sm text-brand-pink">View all</Link>
        </div>
        {courses.length ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{courses.slice(0, 3).map((c) => <ProgressCard key={c.id} c={c} />)}</div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="font-medium">You&apos;re not enrolled in any course yet.</p>
            <ButtonLink href="/courses" className="mt-4">Explore courses</ButtonLink>
          </div>
        )}
      </section>
    </div>
  );
}
