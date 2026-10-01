import Link from "next/link";
import { Calendar, IndianRupee, MapPin, Users } from "lucide-react";
import type { Internship } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";

export function stipendText(i: Internship) {
  if (!i.stipend_min && !i.stipend_max) return "Unpaid";
  return `₹${i.stipend_min.toLocaleString("en-IN")}${i.stipend_max ? `–${i.stipend_max.toLocaleString("en-IN")}` : ""} /month`;
}

export function InternshipCard({ i }: { i: Internship }) {
  return (
    <article className="relative rounded-xl border border-border bg-card p-5 transition-[box-shadow,transform] duration-200 hover:shadow-card motion-safe:[@media(hover:hover)]:hover:-translate-y-0.5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold break-words sm:text-lg">
            <Link href={`/internships/${i.slug}`} className="after:absolute after:inset-0 hover:text-primary">{i.title}</Link>
          </h2>
          <p className="text-sm text-muted-foreground">{i.company}</p>
        </div>
        {i.required_course_slug ? <Badge tone="primary">Course completion required</Badge> : <Badge tone="success">Open to all learners</Badge>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:flex sm:flex-wrap">
        <div className="flex items-center gap-1.5 text-muted-foreground"><MapPin className="h-4 w-4" aria-hidden /><dt className="sr-only">Location</dt><dd>{i.location}</dd></div>
        <div className="flex items-center gap-1.5 text-muted-foreground"><Calendar className="h-4 w-4" aria-hidden /><dt className="sr-only">Duration</dt><dd>{i.duration_weeks} weeks</dd></div>
        <div className="flex items-center gap-1.5 text-muted-foreground"><IndianRupee className="h-4 w-4" aria-hidden /><dt className="sr-only">Stipend</dt><dd>{stipendText(i)}</dd></div>
        <div className="flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" aria-hidden /><dt className="sr-only">Openings</dt><dd>{i.openings} opening{i.openings > 1 ? "s" : ""}</dd></div>
      </dl>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <ul className="flex flex-wrap gap-1.5">{i.skills.map((s) => <li key={s}><Badge>{s}</Badge></li>)}</ul>
        {i.apply_by ? <p className="text-xs text-muted-foreground">Apply by {new Date(i.apply_by).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p> : null}
      </div>
    </article>
  );
}
