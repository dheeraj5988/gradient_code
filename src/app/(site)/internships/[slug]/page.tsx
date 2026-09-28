import Link from "next/link";
import { notFound } from "next/navigation";
import { Calendar, IndianRupee, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { getInternship } from "@/lib/data/queries";

export default async function InternshipDetail({ params }: { params: Promise<{ slug: string }> }) {
  const i = await getInternship((await params).slug);
  if (!i) notFound();
  return (
    <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_320px]">
      <div className="space-y-8">
        <div>
          <Link href="/internships" className="text-xs text-muted-foreground hover:underline">← All internships</Link>
          <h1 className="mt-3 text-3xl font-bold">{i.title}</h1>
          <p className="text-muted-foreground">{i.company}</p>
        </div>
        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-border p-5 text-sm sm:grid-cols-4">
          <div><MapPin className="mb-1 h-4 w-4 text-muted-foreground" />{i.location}</div>
          <div><Calendar className="mb-1 h-4 w-4 text-muted-foreground" />{i.duration_weeks} weeks</div>
          <div><IndianRupee className="mb-1 h-4 w-4 text-muted-foreground" />{i.stipend_min.toLocaleString("en-IN")}{i.stipend_max ? `–${i.stipend_max.toLocaleString("en-IN")}` : ""}/mo</div>
          <div><Users className="mb-1 h-4 w-4 text-muted-foreground" />{i.openings} openings</div>
        </div>
        <section><h2 className="mb-2 text-xl font-bold">About the internship</h2><p className="text-muted-foreground">{i.description}</p></section>
        <section><h2 className="mb-2 text-xl font-bold">Responsibilities</h2><ul className="list-disc space-y-1 pl-5 text-muted-foreground">{i.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul></section>
        <section><h2 className="mb-2 text-xl font-bold">Skills required</h2><div className="flex flex-wrap gap-2">{i.skills.map((s) => <Badge key={s}>{s}</Badge>)}</div></section>
        <section><h2 className="mb-2 text-xl font-bold">Perks</h2><div className="flex flex-wrap gap-2">{i.perks.map((s) => <Badge key={s} tone="success">{s}</Badge>)}</div></section>
      </div>
      <aside>
        <div className="sticky top-20 space-y-4 rounded-2xl border border-border bg-card p-6">
          {i.apply_by ? <p className="text-sm text-muted-foreground">Apply by <strong className="text-foreground">{new Date(i.apply_by).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong></p> : null}
          {i.required_course_slug ? (
            <p className="rounded-xl bg-brand-purple/10 p-3 text-sm">
              Requires completion of the <Link href={`/courses/${i.required_course_slug}`} className="text-brand-pink underline">linked course</Link>.
            </p>
          ) : null}
          {/* TODO(antigravity): apply form (resume upload to Supabase Storage + cover note) → internship_applications */}
          <ButtonLink href={`/dashboard/applications?apply=${i.slug}`} size="lg" className="w-full">Apply now</ButtonLink>
        </div>
      </aside>
    </div>
  );
}
