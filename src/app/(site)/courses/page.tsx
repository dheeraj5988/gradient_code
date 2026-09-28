import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { SlidersHorizontal, X, SearchX } from "lucide-react";
import { CourseCard } from "@/components/course/course-card";
import { SortSelect } from "@/components/course/sort-select";
import { EmptyState } from "@/components/ui/empty-state";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { getCourses, getFacets } from "@/lib/data/queries";
import type { CourseFilters } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Courses",
  description: "Browse practical courses in full stack development, data science, AI, cloud and more. Filter by level, duration, price and more.",
  alternates: { canonical: "/courses" },
};

type SP = Record<string, string | undefined>;
const PAGE_SIZE = 12;
const FILTER_KEYS = ["q", "track", "level", "language", "duration", "price", "rating", "certificate", "internship", "projects", "format"] as const;

const LABELS: Record<string, Record<string, string>> = {
  duration: { short: "Under 5 hours", medium: "5–20 hours", long: "Over 20 hours" },
  price: { free: "Free", paid: "Paid" },
  rating: { "4.5": "4.5 & up", "4": "4.0 & up" },
  certificate: { "1": "Certificate included" },
  internship: { "1": "Internship pathway" },
  projects: { "1": "Includes projects" },
  format: { short: "Short courses" },
};

function href(sp: SP, patch: SP) {
  const p = new URLSearchParams();
  Object.entries({ ...sp, page: undefined, ...patch }).forEach(([k, v]) => v && p.set(k, v));
  const s = p.toString();
  return s ? `/courses?${s}` : "/courses";
}

function FilterGroup({ title, name, options, sp, type = "radio" }: {
  title: string; name: string; options: { value: string; label: string; count?: number; name?: string }[]; sp: SP; type?: "radio" | "check";
}) {
  if (!options.length) return null;
  return (
    <div role="group" aria-label={title} className="border-b border-border py-5 first:pt-0">
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="space-y-1">
        {options.map((o) => {
          const key = o.name ?? name;
          const active = sp[key] === o.value;
          return (
            <li key={key + o.value}>
              <Link
                href={href(sp, { [key]: active ? undefined : o.value })}
                aria-current={active ? "true" : undefined}
                className="flex items-center gap-2.5 rounded-md py-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <span aria-hidden className={cn("grid h-4 w-4 shrink-0 place-items-center border", type === "radio" ? "rounded-full" : "rounded", active ? "border-primary bg-primary" : "border-border-strong bg-background")}>
                  {active ? <span className={cn("bg-primary-foreground", type === "radio" ? "h-1.5 w-1.5 rounded-full" : "h-1.5 w-2 rounded-[1px]")} /> : null}
                </span>
                <span className={cn("flex-1", active && "font-medium text-foreground")}>{o.label}</span>
                {o.count != null ? <span className="text-xs text-subtle-foreground tabular-nums">{o.count}</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Filters({ sp, facets }: { sp: SP; facets: Awaited<ReturnType<typeof getFacets>> }) {
  return (
    <div>
      <FilterGroup title="Category" name="track" sp={sp} options={facets.tracks.map((t) => ({ value: t.name, label: t.name, count: t.count }))} />
      <FilterGroup title="Level" name="level" sp={sp} options={facets.levels.map((t) => ({ value: t.name, label: t.name, count: t.count }))} />
      <FilterGroup title="Duration" name="duration" sp={sp} options={Object.entries(LABELS.duration).map(([value, label]) => ({ value, label }))} />
      <FilterGroup title="Price" name="price" sp={sp} options={Object.entries(LABELS.price).map(([value, label]) => ({ value, label }))} />
      <FilterGroup title="Rating" name="rating" sp={sp} options={Object.entries(LABELS.rating).map(([value, label]) => ({ value, label }))} />
      {facets.languages.length > 1 ? <FilterGroup title="Language" name="language" sp={sp} options={facets.languages.map((t) => ({ value: t.name, label: t.name, count: t.count }))} /> : null}
      <FilterGroup
        title="Features"
        name="certificate"
        type="check"
        sp={sp}
        options={[
          { name: "certificate", value: "1", label: "Certificate included" },
          { name: "internship", value: "1", label: "Internship pathway" },
          { name: "projects", value: "1", label: "Includes projects" },
          { name: "format", value: "short", label: "Short courses" },
        ]}
      />
    </div>
  );
}

export default async function CoursesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  // Back-compat for old links: ?crash=1
  if (sp.crash) sp.format = "short";
  const filters = Object.fromEntries(FILTER_KEYS.map((k) => [k, sp[k]])) as CourseFilters;
  const [courses, facets] = await Promise.all([getCourses({ ...filters, sort: sp.sort as CourseFilters["sort"] }), getFacets()]);

  const page = Math.max(1, Number(sp.page) || 1);
  const pages = Math.max(1, Math.ceil(courses.length / PAGE_SIZE));
  const visible = courses.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const active = FILTER_KEYS.filter((k) => sp[k]);
  const title = sp.q ? `Results for “${sp.q}”` : sp.track ?? "All courses";

  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Courses", href: "/courses" }, ...(sp.track ? [{ label: sp.track }] : [])]} />
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        <p className="mt-2 text-muted-foreground">Practical, project-based courses. Preview a lesson free before you buy.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        {/* Desktop filters */}
        <aside aria-label="Filters" className="hidden lg:block">
          <Filters sp={sp} facets={facets} />
        </aside>

        <div className="min-w-0">
          {/* Mobile filters */}
          <details className="mb-4 rounded-lg border border-border lg:hidden">
            <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-sm font-semibold">
              <SlidersHorizontal className="h-4 w-4" aria-hidden /> Filters {active.length ? <span className="rounded bg-primary px-1.5 text-xs text-primary-foreground">{active.length}</span> : null}
            </summary>
            <div className="border-t border-border p-4"><Filters sp={sp} facets={facets} /></div>
          </details>

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              <strong className="text-foreground">{courses.length}</strong> {courses.length === 1 ? "result" : "results"}
            </p>
            <Suspense><SortSelect /></Suspense>
          </div>

          {active.length ? (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {active.map((k) => (
                <Link key={k} href={href(sp, { [k]: undefined, ...(k === "format" ? { crash: undefined } : {}) })} className="inline-flex items-center gap-1.5 rounded-md border border-primary/25 bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/10">
                  {k === "q" ? `“${sp.q}”` : LABELS[k]?.[sp[k]!] ?? sp[k]}
                  <X className="h-3 w-3" aria-label="Remove filter" />
                </Link>
              ))}
              <Link href="/courses" className="text-xs font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Clear all</Link>
            </div>
          ) : null}

          {visible.length ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((c, i) => <CourseCard key={c.id} course={c} priority={i < 3} />)}
            </div>
          ) : (
            <EmptyState
              icon={SearchX}
              title="No courses match your filters"
              description="Try removing a filter or searching for a different skill."
              action={<ButtonLink href="/courses" variant="outline" size="sm">Clear all filters</ButtonLink>}
            />
          )}

          {pages > 1 ? (
            <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link key={p} href={href(sp, { page: p === 1 ? undefined : String(p) })} aria-current={p === page ? "page" : undefined} className={cn("grid h-9 min-w-9 place-items-center rounded-lg border px-3 text-sm", p === page ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-surface")}>
                  {p}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>
      </div>
    </div>
  );
}
