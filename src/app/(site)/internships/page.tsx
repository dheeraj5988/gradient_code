import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Calendar, IndianRupee, MapPin, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getInternships } from "@/lib/data/queries";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Internships", description: "Mentored, paid internships for Gradient Code learners." };

const MODES = ["Remote", "Hybrid", "On-site"];

export default async function InternshipsPage({ searchParams }: { searchParams: Promise<{ q?: string; mode?: string }> }) {
  const sp = await searchParams;
  const list = await getInternships(sp);
  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-bold sm:text-4xl">Internships</h1>
      <p className="mt-2 text-muted-foreground">Real work, mentor reviews and a certificate. Some roles unlock after you complete a linked course.</p>

      <form className="mt-6 flex flex-wrap gap-2">
        <div className="relative min-w-60 flex-1">
          <Search className="absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input name="q" defaultValue={sp.q} placeholder="Search role or skill" className="h-11 w-full rounded-xl border border-border bg-surface pr-4 pl-10 text-sm" />
        </div>
        {sp.mode ? <input type="hidden" name="mode" value={sp.mode} /> : null}
        <button className="gradient-fill rounded-xl px-5 text-sm font-semibold">Search</button>
      </form>
      <div className="mt-3 flex gap-2">
        {MODES.map((m) => (
          <Link key={m} href={sp.mode === m ? "/internships" : `/internships?mode=${m}`} className={cn("rounded-full border border-border px-3 py-1 text-xs", sp.mode === m ? "gradient-fill border-transparent" : "text-muted-foreground")}>
            {m}
          </Link>
        ))}
      </div>

      <ul className="mt-8 space-y-4">
        {list.map((i) => (
          <li key={i.id}>
            <Link href={`/internships/${i.slug}`} className="gradient-border block rounded-2xl border border-border bg-card p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold">{i.title}</h2>
                  <p className="text-sm text-muted-foreground">{i.company}</p>
                </div>
                {i.required_course_slug ? <Badge tone="brand">Course-linked</Badge> : <Badge tone="success">Open to all</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{i.location}</span>
                <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{i.duration_weeks} weeks</span>
                <span className="flex items-center gap-1.5"><IndianRupee className="h-4 w-4" />{i.stipend_min.toLocaleString("en-IN")}{i.stipend_max ? `–${i.stipend_max.toLocaleString("en-IN")}` : ""} /month</span>
                <span className="flex items-center gap-1.5"><Briefcase className="h-4 w-4" />{i.openings} opening{i.openings > 1 ? "s" : ""}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">{i.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div>
            </Link>
          </li>
        ))}
        {!list.length ? <li className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground">No internships match. Check back soon.</li> : null}
      </ul>
    </div>
  );
}
