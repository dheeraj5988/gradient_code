import type { Metadata } from "next";
import Link from "next/link";
import { SlidersHorizontal, X } from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { getCourses, getTracks } from "@/lib/data/queries";
import type { CourseFilters } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All courses", description: "Browse Gradient Code courses by track, level and price." };

type SP = Promise<Record<string, string | undefined>>;
const LEVELS = ["Beginner", "Intermediate", "Advanced", "All levels"];
const SORTS: [NonNullable<CourseFilters["sort"]>, string][] = [
  ["popular", "Most popular"], ["rating", "Highest rated"], ["newest", "Newest"], ["price-low", "Price: low to high"], ["price-high", "Price: high to low"],
];

function href(current: Record<string, string | undefined>, patch: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  Object.entries({ ...current, ...patch }).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `/courses?${s}` : "/courses";
}

function FilterGroup({ title, name, options, sp }: { title: string; name: string; options: [string, string][]; sp: Record<string, string | undefined> }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      <ul className="space-y-1">
        {options.map(([value, label]) => {
          const active = sp[name] === value;
          return (
            <li key={value}>
              <Link
                href={href(sp, { [name]: active ? undefined : value })}
                className={cn("flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-surface-2", active ? "text-foreground" : "text-muted-foreground")}
              >
                <span className={cn("h-4 w-4 rounded border border-border", active && "gradient-fill border-transparent")} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default async function CoursesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const [all, tracks] = await Promise.all([
    getCourses({ q: sp.q, track: sp.track, level: sp.level, price: sp.price as CourseFilters["price"], sort: sp.sort as CourseFilters["sort"] }),
    getTracks(),
  ]);
  const courses = sp.crash ? all.filter((c) => c.is_crash_course) : all;
  const active = ["q", "track", "level", "price", "crash"].filter((k) => sp[k]);

  return (
    <div className="container-page py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{sp.crash ? "Crash courses" : sp.q ? `Results for “${sp.q}”` : "All courses"}</h1>
        <p className="mt-2 text-muted-foreground">{courses.length} course{courses.length === 1 ? "" : "s"}</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-6">
          <p className="flex items-center gap-2 text-sm font-semibold"><SlidersHorizontal className="h-4 w-4" /> Filters</p>
          <FilterGroup title="Track" name="track" sp={sp} options={tracks.map((t) => [t.name, `${t.name} (${t.count})`])} />
          <FilterGroup title="Level" name="level" sp={sp} options={LEVELS.map((l) => [l, l])} />
          <FilterGroup title="Price" name="price" sp={sp} options={[["free", "Free"], ["paid", "Paid"]]} />
          <FilterGroup title="Format" name="crash" sp={sp} options={[["1", "Crash courses only"]]} />
        </aside>

        <div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {active.map((k) => (
                <Link key={k} href={href(sp, { [k]: undefined })} className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs">
                  {k === "crash" ? "Crash" : sp[k]} <X className="h-3 w-3" />
                </Link>
              ))}
              {active.length > 1 ? <Link href="/courses" className="px-2 py-1 text-xs text-muted-foreground underline">Clear all</Link> : null}
            </div>
            <div className="flex flex-wrap gap-1 text-xs">
              {SORTS.map(([v, l]) => (
                <Link key={v} href={href(sp, { sort: v })} className={cn("rounded-full px-3 py-1.5", (sp.sort ?? "popular") === v ? "bg-surface-2 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                  {l}
                </Link>
              ))}
            </div>
          </div>

          {courses.length ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {courses.map((c) => <CourseCard key={c.id} course={c} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <p className="font-medium">No courses match these filters.</p>
              <Link href="/courses" className="mt-2 inline-block text-sm text-brand-pink underline">Clear filters</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
