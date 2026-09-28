import type { Metadata } from "next";
import Link from "next/link";
import { Search, Briefcase } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { EmptyState } from "@/components/ui/empty-state";
import { InternshipCard } from "@/components/internship/internship-card";
import { getInternships } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Internships",
  description: "Mentored internships for Gradient Code learners — remote, hybrid and on-site.",
  alternates: { canonical: "/internships" },
};

const MODES = ["Remote", "Hybrid", "On-site"];

export default async function InternshipsPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const sp = await searchParams;
  const list = await getInternships(sp);
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Internships" }]} />
      <h1 className="mt-4 text-3xl font-bold sm:text-4xl">Internships</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Gain real-world experience. Some internships are linked to a course — complete it to become eligible.</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside aria-label="Filters" className="space-y-6">
          <form role="search">
            <label htmlFor="iq" className="mb-2 block text-sm font-semibold">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <input id="iq" name="q" defaultValue={sp.q} placeholder="Role or skill" className="h-10 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            {sp.mode ? <input type="hidden" name="mode" value={sp.mode} /> : null}
          </form>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">Work mode</legend>
            <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {MODES.map((m) => {
                const active = sp.mode === m;
                const p = new URLSearchParams();
                if (sp.q) p.set("q", sp.q);
                if (!active) p.set("mode", m);
                return (
                  <li key={m}>
                    <Link href={`/internships${p.size ? `?${p}` : ""}`} aria-current={active ? "true" : undefined} className={cn("block rounded-md border px-3 py-1.5 text-sm lg:border-transparent lg:px-2", active ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground")}>
                      {m}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </fieldset>
          {/* TODO(antigravity, Phase 7): stipend, duration, skills, course and deadline filters. */}
        </aside>

        <div className="min-w-0">
          <p className="mb-4 text-sm text-muted-foreground" aria-live="polite"><strong className="text-foreground">{list.length}</strong> {list.length === 1 ? "internship" : "internships"}</p>
          {list.length ? (
            <ul className="space-y-4">{list.map((i) => <li key={i.id}><InternshipCard i={i} /></li>)}</ul>
          ) : (
            <EmptyState icon={Briefcase} title="No internships match" description="Try a different search, or check back soon for new openings." />
          )}
        </div>
      </div>
    </div>
  );
}
