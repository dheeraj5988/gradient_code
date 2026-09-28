import Link from "next/link";
import { Briefcase, Clock, Zap } from "lucide-react";
import type { Course } from "@/lib/data/types";
import { discountPercent, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/rating";
import { CourseThumb } from "@/components/course-thumb";

export function CourseCard({ course }: { course: Course }) {
  const off = discountPercent(course.price, course.mrp);
  return (
    <Link
      href={`/courses/${course.slug}`}
      className="gradient-border group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1"
    >
      <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{course.level}</Badge>
          {course.is_crash_course ? <Badge tone="warning"><Zap className="h-3 w-3" />Crash</Badge> : null}
          {course.has_internship ? <Badge tone="success"><Briefcase className="h-3 w-3" />Internship</Badge> : null}
        </div>
        <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug group-hover:text-brand-pink">
          {course.title}
        </h3>
        {course.instructor ? <p className="text-xs text-muted-foreground">{course.instructor.name}</p> : null}
        <Rating value={course.rating_avg} count={course.rating_count} />
        {course.includes.hours ? (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> {course.includes.hours} hours · {course.language}
          </p>
        ) : null}
        <div className="mt-auto flex items-baseline gap-2 pt-2">
          <span className="text-lg font-bold">{formatPrice(course.price)}</span>
          {off ? (
            <>
              <span className="text-sm text-muted-foreground line-through">{formatPrice(course.mrp!)}</span>
              <span className="text-xs font-semibold text-success">{off}% off</span>
            </>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
