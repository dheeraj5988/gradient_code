import Link from "next/link";
import { Award, Briefcase, Clock, FolderGit2, Zap } from "lucide-react";
import type { Course } from "@/lib/data/types";
import { discountPercent, formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Rating } from "@/components/rating";
import { CourseThumb } from "@/components/course-thumb";
import { WishlistButton } from "@/components/course/wishlist-button";

type Props = { course: Course; priority?: boolean; showWishlist?: boolean; signedIn?: boolean; saved?: boolean; refreshOnChange?: boolean };

export function CourseCard({ course, priority, showWishlist, signedIn = false, saved = false, refreshOnChange }: Props) {
  const off = discountPercent(course.price, course.mrp);
  const meta = [
    course.includes.hours ? { icon: Clock, text: `${course.includes.hours}h` } : null,
    course.includes.projects ? { icon: FolderGit2, text: `${course.includes.projects} project${course.includes.projects > 1 ? "s" : ""}` } : null,
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  return (
    <article className="group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,transform] duration-200 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background hover:shadow-card motion-safe:[@media(hover:hover)]:hover:-translate-y-0.5">
      <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} priority={priority} />
      {showWishlist ? (
        <div className="absolute top-2 right-2 z-10">
          <WishlistButton courseId={course.id} slug={course.slug} title={course.title} initialSaved={saved} signedIn={signedIn} refreshOnChange={refreshOnChange} />
        </div>
      ) : null}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium text-primary">{course.track}</p>
        <h3 className="mt-1 line-clamp-2 text-base leading-snug font-semibold text-foreground sm:text-[15px]">
          <Link href={`/courses/${course.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primary">
            {course.title}
          </Link>
        </h3>
        {course.instructor ? <p className="mt-1 truncate text-xs text-muted-foreground">{course.instructor.name}</p> : null}
        <Rating value={course.rating_avg} count={course.rating_count} className="mt-2" />
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{course.level}</span>
          {meta.map((m) => (
            <span key={m.text} className="inline-flex items-center gap-1"><m.icon className="h-3.5 w-3.5" aria-hidden />{m.text}</span>
          ))}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {course.includes.certificate !== false ? <Badge><Award className="h-3 w-3" aria-hidden />Certificate</Badge> : null}
          {course.has_internship ? <Badge tone="success"><Briefcase className="h-3 w-3" aria-hidden />Internship pathway</Badge> : null}
          {course.is_crash_course ? <Badge tone="warning"><Zap className="h-3 w-3" aria-hidden />Short course</Badge> : null}
        </div>
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-4">
          <span className="text-lg font-bold">{formatPrice(course.price)}</span>
          {off ? (
            <>
              <span className="text-sm text-subtle-foreground line-through">{formatPrice(course.mrp!)}</span>
              <span className="text-xs font-semibold text-success">{off}% off</span>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
