import Link from "next/link";
import { CourseThumb } from "@/components/course-thumb";
import type { MyCourse } from "@/lib/data/queries";

export function ProgressCard({ c }: { c: MyCourse }) {
  return (
    <Link href={`/learn/${c.slug}`} className="gradient-border flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
      <CourseThumb src={c.thumbnail_url} title={c.title} track={c.track} />
      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-semibold">{c.title}</h3>
        <div className="mt-auto">
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className="gradient-fill h-full" style={{ width: `${c.progress}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{c.progress ? `${c.progress}% complete · ${c.completed}/${c.total} lessons` : "Start course"}</p>
        </div>
      </div>
    </Link>
  );
}
