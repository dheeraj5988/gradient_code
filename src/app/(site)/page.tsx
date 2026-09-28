import Link from "next/link";
import { ArrowRight, Award, BadgeCheck, Briefcase, Code2, Hammer, PlayCircle, Search, Users } from "lucide-react";
import { Blobs, Eyebrow, SectionHeading } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { CourseCard } from "@/components/course/course-card";
import { getFeaturedCourses, getInternships, getTracks } from "@/lib/data/queries";

export const revalidate = 300;

const STEPS = [
  { icon: Search, title: "Pick a track", body: "Choose a career path — full stack, data science, AI or cloud." },
  { icon: PlayCircle, title: "Learn by doing", body: "Short video lessons, notes, quizzes and downloadable code." },
  { icon: Hammer, title: "Ship projects", body: "Build portfolio projects reviewed by mentors." },
  { icon: Briefcase, title: "Get certified & hired", body: "Earn a verifiable certificate and unlock internships." },
];

const OUTCOMES = [
  { value: "Project-first", label: "every course ends in a portfolio build" },
  { value: "Lifetime", label: "access on most programs" },
  { value: "Verifiable", label: "certificates with a public ID" },
  { value: "Internships", label: "unlocked by completing courses" },
];

export default async function HomePage() {
  const [courses, tracks, internships] = await Promise.all([getFeaturedCourses(6), getTracks(), getInternships()]);
  return (
    <>
      {/* HERO — Coursera-style: search first, then proof */}
      <section className="relative overflow-hidden">
        <Blobs />
        <div className="grid-bg absolute inset-0" />
        <div className="container-page relative grid gap-12 py-20 lg:grid-cols-[1.15fr_1fr] lg:py-28">
          <div className="space-y-7">
            <Eyebrow>Courses · Projects · Internships</Eyebrow>
            <h1 className="text-4xl font-bold leading-[1.05] text-balance sm:text-6xl">
              Learn skills that <span className="gradient-text">actually ship.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Industry-led courses in full stack, data science and AI — with hands-on projects, verifiable certificates and internships for top learners.
            </p>
            <form action="/courses" className="flex max-w-xl gap-2 rounded-full border border-border bg-surface p-1.5">
              <Search className="ml-3 h-5 w-5 self-center text-muted-foreground" />
              <input name="q" placeholder="Try “Python”, “React”, “Generative AI”" aria-label="Search courses" className="flex-1 bg-transparent text-sm focus:outline-none" />
              <button className="gradient-fill rounded-full px-5 py-2.5 text-sm font-semibold">Search</button>
            </form>
            <div className="flex flex-wrap gap-2 text-xs">
              {tracks.slice(0, 5).map((t) => (
                <Link key={t.name} href={`/courses?track=${encodeURIComponent(t.name)}`} className="rounded-full border border-border px-3 py-1.5 text-muted-foreground hover:text-foreground">
                  {t.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative hidden lg:block">
            <div className="float-slow gradient-border-static rounded-3xl bg-surface p-6 glow">
              <div className="mb-4 flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <span className="h-3 w-3 rounded-full bg-destructive/70" /><span className="h-3 w-3 rounded-full bg-warning/70" /><span className="h-3 w-3 rounded-full bg-success/70" />
                <span className="ml-2">model.py</span>
              </div>
              <pre className="overflow-hidden font-mono text-sm leading-relaxed text-muted-foreground">
{`from sklearn.ensemble import RandomForestClassifier

model = RandomForestClassifier(n_estimators=200)
model.fit(X_train, y_train)

print(f"accuracy: {model.score(X_test, y_test):.2%}")`}
              </pre>
              <div className="mt-5 flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
                <BadgeCheck className="h-8 w-8 text-success" />
                <div>
                  <p className="text-sm font-semibold">Project submitted</p>
                  <p className="text-xs text-muted-foreground">Mentor review in progress</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUTCOME STRIP */}
      <section className="border-y border-border bg-surface/50">
        <div className="container-page grid grid-cols-2 gap-6 py-8 md:grid-cols-4">
          {OUTCOMES.map((o) => (
            <div key={o.value}>
              <p className="font-display text-xl font-bold gradient-text">{o.value}</p>
              <p className="text-sm text-muted-foreground">{o.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURED COURSES — Udemy-style card grid */}
      <section className="container-page py-20">
        <SectionHeading
          center={false}
          eyebrow="Popular programs"
          title="Start with our most-loved courses"
          action={<ButtonLink href="/courses" variant="outline" size="sm">View all <ArrowRight className="h-4 w-4" /></ButtonLink>}
        />
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => <CourseCard key={c.id} course={c} />)}
        </div>
      </section>

      {/* TRACKS */}
      <section className="container-page py-10">
        <SectionHeading eyebrow="Explore" title="Browse by career track" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => (
            <Link key={t.name} href={`/courses?track=${encodeURIComponent(t.name)}`} className="gradient-border flex items-center justify-between rounded-2xl border border-border bg-card p-5">
              <span className="flex items-center gap-3">
                <Code2 className="h-5 w-5 text-brand-pink" />
                <span className="font-medium">{t.name}</span>
              </span>
              <span className="text-sm text-muted-foreground">{t.count} course{t.count === 1 ? "" : "s"}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="How it works" title="From first lesson to first offer" />
        <div className="mt-12 grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-border bg-card p-6">
              <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
              <s.icon className="mt-3 h-7 w-7 text-brand-pink" />
              <h3 className="mt-4 font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* INTERNSHIPS TEASER — Internshala-style */}
      <section className="container-page py-10">
        <div className="gradient-border-static relative overflow-hidden rounded-3xl bg-surface p-8 md:p-12">
          <Blobs />
          <div className="relative grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-center">
            <div className="space-y-4">
              <Eyebrow>Internships</Eyebrow>
              <h2 className="text-3xl font-bold">Complete a course. Unlock an internship.</h2>
              <p className="text-muted-foreground">Top learners get priority access to paid, mentored internships on real products.</p>
              <ButtonLink href="/internships">See open roles <ArrowRight className="h-4 w-4" /></ButtonLink>
            </div>
            <ul className="space-y-3">
              {internships.slice(0, 3).map((i) => (
                <li key={i.id}>
                  <Link href={`/internships/${i.slug}`} className="flex items-center justify-between rounded-2xl border border-border bg-background/60 p-4 hover:bg-surface-2">
                    <span>
                      <span className="block font-medium">{i.title}</span>
                      <span className="text-xs text-muted-foreground">{i.location} · {i.duration_weeks} weeks</span>
                    </span>
                    <span className="text-sm font-semibold text-success">₹{i.stipend_min.toLocaleString("en-IN")}+/mo</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* WHY / TRUST */}
      <section className="container-page py-20">
        <SectionHeading eyebrow="Why Gradient Code" title="Built for outcomes, not watch-time" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {[
            { icon: Hammer, t: "Learn by shipping", b: "Every module ends with something you build and push to GitHub." },
            { icon: Users, t: "Mentors who work in industry", b: "Doubt forum and project reviews from practising engineers." },
            { icon: Award, t: "Certificates that verify", b: "Each certificate has a public ID employers can check." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl border border-border bg-card p-6">
              <x.icon className="h-7 w-7 text-brand-pink" />
              <h3 className="mt-4 font-semibold">{x.t}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{x.b}</p>
            </div>
          ))}
        </div>
        {/* TODO(antigravity): testimonials section — real learner quotes only, pulled from course_reviews. */}
      </section>

      {/* CTA */}
      <section className="container-page">
        <div className="gradient-fill rounded-3xl p-10 text-center md:p-14">
          <h2 className="text-3xl font-bold">Your first lesson is free.</h2>
          <p className="mx-auto mt-3 max-w-lg text-white/85">Create an account and preview any course before you buy.</p>
          <ButtonLink href="/signup" variant="secondary" size="lg" className="mt-7">Create free account</ButtonLink>
        </div>
      </section>
    </>
  );
}
