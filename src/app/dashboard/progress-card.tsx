import Link from "next/link";
import { CourseThumb } from "@/components/course-thumb";
import { ProgressBar } from "@/components/ui/progress-bar";
import type { MyCourse } from "@/lib/data/queries";

export function ProgressCard({ c }: { c: MyCourse }) {
  const done = c.progress === 100;
  return (
    <article className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-card">
      <CourseThumb src={c.thumbnail_url} title={c.title} track={c.track} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-[15px] font-semibold">
          <Link href={`/learn/${c.slug}`} className="after:absolute after:inset-0 hover:text-primary">{c.title}</Link>
        </h3>
        <div className="mt-auto">
          <ProgressBar value={c.progress} tone={done ? "success" : "primary"} label={`${c.title} progress`} size="sm" />
          <p className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{done ? "Completed" : c.progress ? `${c.progress}% complete` : "Not started"}</span>
            {c.total ? <span className="tabular-nums">{c.completed}/{c.total} lessons</span> : null}
          </p>
        </div>
      </div>
    </article>
  );
}
