import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, BadgeCheck, BarChart3, BookOpen, Briefcase, Calendar, ChevronRight, Cloud, Code2, FolderGit2, Layers, MapPin, PenTool, Search, ShieldCheck, BrainCircuit } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/ui/section";
import { CourseCard } from "@/components/course/course-card";
import { getFeaturedCourses, getInstructors, getInternships, getTracks } from "@/lib/data/queries";
import { CERTIFICATE_POINTS, FAQS, HOW_IT_WORKS } from "@/lib/content/site";

export const revalidate = 300;
export const metadata: Metadata = { alternates: { canonical: "/" } };

const TRACK_ICONS: Record<string, typeof Layers> = {
  "Full Stack Development": Layers,
  "Data Science & AI": BrainCircuit,
  "Data Analytics": BarChart3,
  "Cloud & DevOps": Cloud,
  Cybersecurity: ShieldCheck,
  "UI/UX & Product Design": PenTool,
};

export default async function HomePage() {
  const [courses, tracks, internships, instructors] = await Promise.all([getFeaturedCourses(8), getTracks(), getInternships(), getInstructors()]);
  const withProjects = courses.filter((c) => (c.includes.projects ?? 0) > 0);

  return (
    <>
      {/* 1. HERO */}
      <section className="hero-tint border-b border-border bg-surface">
        <div className="container-page grid gap-8 py-10 sm:gap-10 sm:py-16 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12 lg:py-24">
          <div>
            <h1 className="text-[32px] leading-[1.12] font-bold tracking-tight text-balance sm:text-5xl lg:text-[56px] lg:leading-[1.08]">
              Learn practical skills. Build real projects. Get certified.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Industry-oriented courses and programs that help you develop practical technical skills — and demonstrate them through projects and assessments.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink href="/courses" size="lg" className="w-full sm:w-auto">Explore courses</ButtonLink>
              <ButtonLink href="/programs" size="lg" variant="outline" className="w-full sm:w-auto">Explore programs</ButtonLink>
            </div>
          </div>

          {/* Spotlight: the top featured course (real data) */}
          {courses[0] ? (
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">Featured course</p>
                <Badge tone="primary">{courses[0].level}</Badge>
              </div>
              <p className="mt-3 text-xs font-medium text-primary">{courses[0].track}</p>
              <h2 className="mt-1 text-xl font-semibold">{courses[0].title}</h2>
              {courses[0].what_you_learn.length ? (
                <ul className="mt-4 space-y-2">
                  {courses[0].what_you_learn.slice(0, 4).map((w) => (
                    <li key={w} className="flex gap-2.5 text-sm text-muted-foreground"><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{w}</li>
                  ))}
                </ul>
              ) : null}
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  {courses[0].includes.hours ? <span>{courses[0].includes.hours} hours</span> : null}
                  {courses[0].includes.projects ? <span>{courses[0].includes.projects} projects</span> : null}
                  {courses[0].includes.certificate !== false ? <span>Certificate</span> : null}
                </p>
                <Link href={`/courses/${courses[0].slug}`} className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View course <ArrowRight className="h-4 w-4" aria-hidden /></Link>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 2. DISCOVERY / SEARCH */}
      <section className="container-page py-12">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">What do you want to learn?</h2>
          <form action="/courses" role="search" className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <input name="q" aria-label="Search courses" placeholder="Search by skill or topic, e.g. Python, React, SQL" className="h-12 w-full rounded-lg border border-input bg-background pr-4 pl-11 text-base placeholder:text-subtle-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <button className="h-12 rounded-lg bg-primary px-6 font-semibold text-primary-foreground hover:bg-primary-hover">Search</button>
          </form>
          {tracks.length ? (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Popular:</span>
              {tracks.slice(0, 6).map((t) => (
                <Link key={t.name} href={`/courses?track=${encodeURIComponent(t.name)}`} className="rounded-md border border-border px-2.5 py-1 text-muted-foreground hover:border-primary hover:text-primary">{t.name}</Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {/* 3. CATEGORIES (from real course data) */}
      {tracks.length ? (
        <section className="container-page py-8">
          <SectionHeader title="Browse by category" />
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => {
              const Icon = TRACK_ICONS[t.name] ?? Code2;
              return (
                <li key={t.name}>
                  <Link href={`/courses?track=${encodeURIComponent(t.name)}`} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-primary-soft/40">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-5 w-5" aria-hidden /></span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold group-hover:text-primary">{t.name}</span>
                      <span className="text-sm text-muted-foreground">{t.count} course{t.count === 1 ? "" : "s"}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-subtle-foreground" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* 4. FEATURED COURSES */}
      {courses.length ? (
        <section className="container-page py-12">
          <SectionHeader
            title="Featured courses"
            description="Start with our most complete, project-based courses."
            action={<Link href="/courses" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View all courses <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {courses.slice(0, 4).map((c, i) => <CourseCard key={c.id} course={c} priority={i < 2} />)}
          </div>
        </section>
      ) : null}

      {/* 5. CAREER PROGRAMS — rendered once a `programs` table exists (Phase 2). */}

      {/* 6. PROJECTS — derived from courses that include projects */}
      {withProjects.length ? (
        <section className="border-y border-border bg-surface py-14">
          <div className="container-page">
            <SectionHeader title="Learn by building" description="These courses include hands-on projects you submit and keep in your portfolio." />
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {withProjects.slice(0, 3).map((c) => (
                <li key={c.id} className="rounded-xl border border-border bg-card p-5">
                  <FolderGit2 className="h-5 w-5 text-primary" aria-hidden />
                  <p className="mt-3 font-semibold">{c.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{c.includes.projects} hands-on project{(c.includes.projects ?? 0) > 1 ? "s" : ""}</p>
                  {c.skills.length ? <div className="mt-3 flex flex-wrap gap-1.5">{c.skills.slice(0, 4).map((s) => <Badge key={s}>{s}</Badge>)}</div> : null}
                  <Link href={`/courses/${c.slug}`} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">View course <ArrowRight className="h-4 w-4" aria-hidden /></Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 7. INTERNSHIPS */}
      {internships.length ? (
        <section className="container-page py-14">
          <SectionHeader
            title="Internships for learners"
            description="Apply for internships linked to the courses you complete."
            action={<Link href="/internships" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">All internships <ArrowRight className="h-4 w-4" aria-hidden /></Link>}
          />
          <ul className="mt-8 grid gap-4 md:grid-cols-3">
            {internships.slice(0, 3).map((i) => (
              <li key={i.id}>
                <Link href={`/internships/${i.slug}`} className="block h-full rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-card">
                  <p className="font-semibold">{i.title}</p>
                  <p className="text-sm text-muted-foreground">{i.company}</p>
                  <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" aria-hidden />{i.mode}</span>
                    <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" aria-hidden />{i.duration_weeks} weeks</span>
                  </p>
                  <p className="mt-3 text-sm font-semibold">₹{i.stipend_min.toLocaleString("en-IN")}{i.stipend_max ? `–${i.stipend_max.toLocaleString("en-IN")}` : ""} /month</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 8. HOW IT WORKS */}
      <section className="border-y border-border bg-surface py-14">
        <div className="container-page">
          <SectionHeader title="How Gradient Code works" description="Every course follows the same path from learning to real-world experience." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {HOW_IT_WORKS.map((s, i) => {
              const Icon = [BookOpen, Code2, FolderGit2, Award, Briefcase][i];
              return (
                <li key={s.step} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                    <span className="text-xs font-semibold text-subtle-foreground">Step {i + 1}</span>
                  </div>
                  <h3 className="mt-3 font-semibold">{s.step}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* 9. MENTORS (real instructor rows only) */}
      {instructors.length ? (
        <section className="container-page py-14">
          <SectionHeader title="Learn from practitioners" description="Courses are created by engineers and architects who work with these technologies." />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {instructors.slice(0, 6).map((m) => (
              <li key={m.id}>
                <Link href={`/instructors/${m.slug}`} className="flex h-full gap-4 rounded-xl border border-border bg-card p-5 hover:shadow-card">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft font-semibold text-primary">
                    {m.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{m.name}</span>
                    {m.headline ? <span className="block text-sm text-muted-foreground">{m.headline}</span> : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 10. CERTIFICATES */}
      <section className="container-page py-8">
        <div className="grid gap-8 rounded-xl border border-border bg-card p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold sm:text-[28px]">Certificates that mean something</h2>
            <ul className="mt-5 space-y-3">
              {CERTIFICATE_POINTS.map((p) => (
                <li key={p} className="flex gap-3 text-muted-foreground"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />{p}</li>
              ))}
            </ul>
            <ButtonLink href="/verify" variant="outline" className="mt-6">Verify a certificate</ButtonLink>
          </div>
          <div aria-hidden className="min-w-0 rounded-lg border border-border bg-surface p-4 sm:p-6">
            <div className="rounded-md border border-border bg-background p-6">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">Certificate of completion</span>
                <Award className="h-6 w-6 text-primary" />
              </div>
              <div className="mt-6 h-3 w-40 rounded bg-surface-2" />
              <div className="mt-3 h-5 w-64 max-w-full rounded bg-surface-2" />
              <div className="mt-6 flex justify-between border-t border-border pt-4 text-xs text-subtle-foreground">
                <span>Credential ID</span>
                <span>Verify online</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ */}
      <section className="container-page py-14">
        <div className="grid gap-8 lg:grid-cols-[1fr_2fr]">
          <SectionHeader className="self-start" title="Frequently asked questions" description="Can't find an answer? Contact us." />
          <Accordion>
            {FAQS.map((f) => (
              <AccordionItem key={f.q} title={f.q}>
                <p className="px-5 py-4 text-sm text-muted-foreground sm:pl-11">{f.a}</p>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page pb-16">
        <div className="flex flex-col items-start justify-between gap-6 rounded-xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-bold">Start with a free preview lesson</h2>
            <p className="mt-1 text-primary-foreground/85">Create an account and try any course before you buy.</p>
          </div>
          <Link href="/signup" className="inline-flex h-12 items-center rounded-lg bg-background px-6 font-semibold text-primary hover:bg-primary-soft">Create free account</Link>
        </div>
      </section>
    </>
  );
}
