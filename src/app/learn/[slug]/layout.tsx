import { ThemeToggle } from "@/components/theme-toggle";
import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { X } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CourseNavDrawer } from "@/components/learn/course-nav-drawer";
import { CourseSidebar, type SidebarModule } from "@/components/learn/course-sidebar";
import { getLearningContext, getPractice } from "@/lib/data/learning";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const viewport: Viewport = { viewportFit: "cover" };

export default async function LearnLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await getLearningContext(slug);
  if (!ctx) notFound();
  const enrolled = ctx.access === "enrolled";
  const [practice, interview] = enrolled
    ? await Promise.all([getPractice(ctx.course.id, ctx.userId), getPractice(ctx.course.id, ctx.userId, "interview")])
    : [null, null];

  const modules: SidebarModule[] = ctx.modules.map((m) => ({
    id: m.id,
    title: m.title,
    total: m.lessons.length,
    completed: m.lessons.filter((l) => ctx.completed.has(l.id)).length,
    lessons: m.lessons.map((l) => ({ id: l.id, title: l.title, type: l.type, duration_seconds: l.duration_seconds, is_free_preview: l.is_free_preview, done: ctx.completed.has(l.id) })),
  }));
  const sidebar = <CourseSidebar slug={slug} modules={modules} enrolled={enrolled} practiceCount={practice?.stats.total ?? 0} interviewCount={interview?.stats.total ?? 0} />;

  return (
    <div className="gc-public flex min-h-dvh flex-col bg-background">
      <header className="glass safe-inline sticky top-0 z-30 border-b border-border pt-[env(safe-area-inset-top)]">
        <div className="flex h-14 items-center gap-2 sm:gap-3">
          <Logo className="hidden md:inline-flex" />
          <span className="hidden h-5 w-px bg-border md:block" aria-hidden />
          <CourseNavDrawer label={ctx.course.title}>{sidebar}</CourseNavDrawer>
          <Link href={`/learn/${slug}`} className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-primary">{ctx.course.title}</Link>
          {enrolled ? (
            <div className="hidden w-32 shrink-0 items-center gap-2.5 sm:flex xl:w-48" title={`${ctx.progress.completed} of ${ctx.progress.total} lessons complete`}>
              <ProgressBar value={ctx.progress.percent} size="sm" className="flex-1" label="Course progress" />
              <span className="text-xs font-medium tabular-nums text-muted-foreground">{ctx.progress.percent}%</span>
            </div>
          ) : (
            <ButtonLink href={`/courses/${slug}`} size="sm" className="shrink-0">Enroll</ButtonLink>
          )}
          <ThemeToggle />
          <Link href="/dashboard" aria-label="Back to dashboard" className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2"><X className="h-4 w-4" aria-hidden /></Link>
        </div>
      </header>
      <div className="grid flex-1 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="hidden border-r border-border bg-background lg:block">
          <div className="sticky top-[var(--gc-learn-header)] h-[calc(100dvh-var(--gc-learn-header))] overflow-y-auto overscroll-contain">{sidebar}</div>
        </aside>
        <div id="main" className="min-w-0 bg-surface">{children}</div>
      </div>
    </div>
  );
}
