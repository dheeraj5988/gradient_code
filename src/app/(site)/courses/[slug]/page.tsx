import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, Briefcase, Check, Clock, Download, FileText, FolderGit2, Globe, Heart, Infinity as InfinityIcon, PlayCircle, RefreshCw, Smartphone, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { Accordion, AccordionItem } from "@/components/ui/accordion";
import { EmptyState } from "@/components/ui/empty-state";
import { Rating } from "@/components/rating";
import { CourseThumb } from "@/components/course-thumb";
import { Curriculum } from "@/components/course/curriculum";
import { CourseCard } from "@/components/course/course-card";
import { getCourseBySlug, getCurriculum, getInstructor, getInternships, getRelatedCourses, getReviews, isEnrolled, isWishlisted } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { cn, discountPercent, formatCount, formatDuration, formatPrice } from "@/lib/utils";
import { toggleWishlist } from "./actions";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCourseBySlug(slug);
  if (!c) return { title: "Course not found" };
  const description = c.subtitle ?? c.description.slice(0, 160);
  return {
    title: c.title,
    description,
    alternates: { canonical: `/courses/${slug}` },
    openGraph: { title: c.title, description, type: "website", images: c.thumbnail_url ? [c.thumbnail_url] : [] },
    twitter: { card: "summary_large_image", title: c.title, description },
  };
}

const COURSE_FAQ = [
  { q: "Can I preview the course before buying?", a: "Yes. Lessons marked Preview in the curriculum can be watched for free." },
  { q: "How do I earn the certificate?", a: "Complete the course requirements shown in your learning portal. The certificate is issued with a credential ID anyone can verify." },
  { q: "Can I learn on my phone?", a: "Yes. The learning portal works on mobile, tablet and desktop." },
  { q: "What if I have doubts while learning?", a: "Use the course Q&A inside the learning portal, or contact support." },
];

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getUser();
  const [modules, reviews, enrolled, saved, related, instructorData, internships] = await Promise.all([
    getCurriculum(course.id),
    getReviews(course.id),
    isEnrolled(user?.id ?? null, course.id),
    isWishlisted(user?.id ?? null, course.id),
    getRelatedCourses(course),
    course.instructor?.slug ? getInstructor(course.instructor.slug) : Promise.resolve(null),
    getInternships(),
  ]);
  const linkedInternships = internships.filter((i) => i.required_course_slug === course.slug);
  const off = discountPercent(course.price, course.mrp);
  const lessons = modules.flatMap((m) => m.lessons);
  const totalSecs = lessons.reduce((s, l) => s + l.duration_seconds, 0);
  const preview = lessons.find((l) => l.is_free_preview);
  const ratingDist = [5, 4, 3, 2, 1].map((n) => ({ n, count: reviews.filter((r) => r.rating === n).length }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle ?? course.description,
    provider: { "@type": "Organization", name: "Gradient Code", sameAs: process.env.NEXT_PUBLIC_SITE_URL },
    inLanguage: course.language,
    educationalLevel: course.level,
    offers: { "@type": "Offer", price: course.price, priceCurrency: "INR", category: course.price ? "Paid" : "Free" },
    ...(course.rating_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating_avg, ratingCount: course.rating_count } } : {}),
  };

  const includes = [
    course.includes.hours ? { icon: Clock, text: `${course.includes.hours} hours of video` } : totalSecs ? { icon: Clock, text: `${formatDuration(totalSecs)} of video` } : null,
    lessons.length ? { icon: PlayCircle, text: `${lessons.length} lessons` } : null,
    course.includes.projects ? { icon: FolderGit2, text: `${course.includes.projects} hands-on project${course.includes.projects > 1 ? "s" : ""}` } : null,
    course.includes.articles ? { icon: FileText, text: `${course.includes.articles} articles & notes` } : null,
    course.includes.resources ? { icon: Download, text: `${course.includes.resources} downloadable resources` } : null,
    course.access_policy === "lifetime" ? { icon: InfinityIcon, text: "Lifetime access" } : { icon: RefreshCw, text: `${course.access_days ?? ""} days of access` },
    { icon: Smartphone, text: "Access on mobile and desktop" },
    course.includes.certificate !== false ? { icon: Award, text: "Certificate of completion" } : null,
    course.has_internship ? { icon: Briefcase, text: "Internship pathway" } : null,
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  const sections = [
    ["overview", "Overview"],
    ["curriculum", "Curriculum"],
    ["instructor", "Instructor"],
    ["reviews", "Reviews"],
    ["faq", "FAQ"],
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Header band */}
      <section className="border-b border-border bg-surface">
        <div className="container-page py-8 lg:py-10">
          <div className="lg:max-w-[calc(100%-400px)]">
            <Breadcrumbs items={[{ label: "Courses", href: "/courses" }, { label: course.track, href: `/courses?track=${encodeURIComponent(course.track)}` }, { label: course.title }]} />
            <h1 className="mt-4 text-3xl font-bold leading-tight text-balance sm:text-4xl">{course.title}</h1>
            {course.subtitle ? <p className="mt-3 text-lg text-muted-foreground">{course.subtitle}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {course.is_featured ? <Badge tone="warning">Featured</Badge> : null}
              <Rating value={course.rating_avg} count={course.rating_count} />
              {course.students_count ? <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Users className="h-4 w-4" aria-hidden />{formatCount(course.students_count)} learners</span> : null}
            </div>
            {course.instructor ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Created by{" "}
                {course.instructor.slug ? <Link href={`/instructors/${course.instructor.slug}`} className="font-medium text-primary hover:underline">{course.instructor.name}</Link> : <span className="font-medium text-foreground">{course.instructor.name}</span>}
              </p>
            ) : null}
            <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Globe className="h-4 w-4" aria-hidden />{course.language}</span>
              <span>{course.level}</span>
              <span>Last updated {new Date(course.updated_at).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
        {/* Purchase panel */}
        <aside className="order-first -mt-0 pt-6 lg:order-last lg:-mt-[260px] lg:pt-0">
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-lg lg:sticky lg:top-20">
            <div className="relative">
              <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} priority />
              {preview ? (
                <Link href={`/learn/${course.slug}/lesson/${preview.id}`} className="group absolute inset-0 grid place-items-center">
                  <span className="absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-lg bg-foreground/85 px-3.5 py-2 text-sm font-semibold text-background shadow-sm transition-colors group-hover:bg-foreground"><PlayCircle className="h-4 w-4" aria-hidden />Preview this course</span>
                </Link>
              ) : null}
            </div>
            <div className="space-y-4 p-6">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPrice(course.price)}</span>
                {off ? (
                  <>
                    <span className="text-base text-subtle-foreground line-through">{formatPrice(course.mrp!)}</span>
                    <span className="text-sm font-semibold text-success">{off}% off</span>
                  </>
                ) : null}
              </div>
              {enrolled ? (
                <ButtonLink href={`/learn/${course.slug}`} size="lg" className="w-full">Go to course</ButtonLink>
              ) : (
                <div className="grid gap-2">
                  <ButtonLink href={`/checkout/${course.slug}`} size="lg" className="w-full">{course.price ? "Buy now" : "Enroll for free"}</ButtonLink>
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    {preview ? <ButtonLink href={`/learn/${course.slug}/lesson/${preview.id}`} variant="outline" className="w-full">Preview</ButtonLink> : <span />}
                    <form action={toggleWishlist.bind(null, course.id, course.slug, saved)}>
                      <button aria-pressed={saved} aria-label={saved ? "Remove from wishlist" : "Add to wishlist"} className={buttonClass({ variant: "outline" }, "w-10 px-0")}>
                        <Heart className={cn("h-4 w-4", saved && "fill-danger text-danger")} aria-hidden />
                      </button>
                    </form>
                  </div>
                </div>
              )}
              <p className="text-center text-xs text-muted-foreground">
                Secure payment · <Link href="/refund" className="underline underline-offset-2 hover:text-foreground">Refund policy</Link>
              </p>
              <div className="border-t border-border pt-4">
                <h2 className="mb-3 text-sm font-semibold">This course includes</h2>
                <ul className="space-y-2.5 text-sm">
                  {includes.map((i) => <li key={i.text} className="flex items-center gap-2.5 text-muted-foreground"><i.icon className="h-4 w-4 shrink-0 text-subtle-foreground" aria-hidden />{i.text}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </aside>

        <div className="min-w-0">
          {/* In-page nav */}
          <nav aria-label="Course sections" className="sticky top-16 z-10 -mx-4 mb-8 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur sm:mx-0 sm:px-0">
            <ul className="flex gap-6">
              {sections.map(([id, label]) => (
                <li key={id}><a href={`#${id}`} className="block border-b-2 border-transparent py-3 text-sm font-medium whitespace-nowrap text-muted-foreground hover:border-border-strong hover:text-foreground">{label}</a></li>
              ))}
            </ul>
          </nav>

          <div className="space-y-12">
            <section id="overview" className="scroll-mt-32 space-y-10">
              {course.what_you_learn.length ? (
                <div className="rounded-xl border border-border p-6">
                  <h2 className="mb-4 text-xl font-bold">What you&apos;ll learn</h2>
                  <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                    {course.what_you_learn.map((w) => <li key={w} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />{w}</li>)}
                  </ul>
                </div>
              ) : null}
              {course.skills.length ? (
                <div>
                  <h2 className="mb-3 text-xl font-bold">Skills you&apos;ll gain</h2>
                  <ul className="flex flex-wrap gap-2">{course.skills.map((s) => <li key={s}><Badge className="px-2.5 py-1 text-sm">{s}</Badge></li>)}</ul>
                </div>
              ) : null}
            </section>

            <section id="curriculum" className="scroll-mt-32">
              <h2 className="mb-4 text-xl font-bold">Curriculum</h2>
              {modules.length ? <Curriculum modules={modules} /> : <EmptyState title="Curriculum coming soon" description="The full lesson list will appear here once it is published." />}
            </section>

            {course.includes.projects ? (
              <section>
                <h2 className="mb-3 text-xl font-bold">Projects</h2>
                <div className="flex gap-4 rounded-xl border border-border p-5">
                  <FolderGit2 className="h-6 w-6 shrink-0 text-primary" aria-hidden />
                  <p className="text-sm text-muted-foreground">This course includes <strong className="text-foreground">{course.includes.projects} hands-on project{course.includes.projects > 1 ? "s" : ""}</strong>. You submit your work in the learning portal and keep it in your portfolio.</p>
                </div>
              </section>
            ) : null}

            {course.requirements.length ? (
              <section>
                <h2 className="mb-3 text-xl font-bold">Requirements</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-subtle-foreground">{course.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
            ) : null}

            <section>
              <h2 className="mb-3 text-xl font-bold">Description</h2>
              <div className="max-w-3xl text-[15px] leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</div>
            </section>

            {course.target_audience.length ? (
              <section>
                <h2 className="mb-3 text-xl font-bold">Who this course is for</h2>
                <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground marker:text-subtle-foreground">{course.target_audience.map((r) => <li key={r}>{r}</li>)}</ul>
              </section>
            ) : null}

            {course.instructor ? (
              <section id="instructor" className="scroll-mt-32">
                <h2 className="mb-4 text-xl font-bold">Instructor</h2>
                <div className="rounded-xl border border-border p-6">
                  <div className="flex items-center gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-semibold text-primary">{course.instructor.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</span>
                    <div>
                      {course.instructor.slug ? <Link href={`/instructors/${course.instructor.slug}`} className="font-semibold text-primary hover:underline">{course.instructor.name}</Link> : <p className="font-semibold">{course.instructor.name}</p>}
                      {course.instructor.headline ? <p className="text-sm text-muted-foreground">{course.instructor.headline}</p> : null}
                    </div>
                  </div>
                  {instructorData?.instructor.bio ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{instructorData.instructor.bio}</p> : null}
                </div>
              </section>
            ) : null}

            {course.includes.certificate !== false ? (
              <section>
                <h2 className="mb-3 text-xl font-bold">Certificate</h2>
                <div className="flex gap-4 rounded-xl border border-border p-5">
                  <BadgeCheck className="h-6 w-6 shrink-0 text-success" aria-hidden />
                  <p className="text-sm text-muted-foreground">Earn a certificate by meeting this course&apos;s completion requirements. Each certificate has a unique credential ID that employers can <Link href="/verify" className="text-primary hover:underline">verify online</Link>.</p>
                </div>
              </section>
            ) : null}

            {course.has_internship || linkedInternships.length ? (
              <section>
                <h2 className="mb-3 text-xl font-bold">Internship pathway</h2>
                <p className="mb-4 text-sm text-muted-foreground">Learners who complete this course become eligible to apply for linked internships.</p>
                {linkedInternships.length ? (
                  <ul className="grid gap-3 sm:grid-cols-2">
                    {linkedInternships.map((i) => (
                      <li key={i.id}>
                        <Link href={`/internships/${i.slug}`} className="block rounded-xl border border-border p-4 hover:border-primary/40">
                          <p className="font-semibold">{i.title}</p>
                          <p className="text-sm text-muted-foreground">{i.company} · {i.mode} · {i.duration_weeks} weeks</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </section>
            ) : null}

            <section id="reviews" className="scroll-mt-32">
              <h2 className="mb-4 text-xl font-bold">Learner reviews</h2>
              {reviews.length ? (
                <div className="grid gap-8 md:grid-cols-[220px_1fr]">
                  <div>
                    {course.rating_count ? <p className="text-4xl font-bold text-rating">{course.rating_avg.toFixed(1)}</p> : null}
                    <Rating value={course.rating_avg} count={course.rating_count} />
                    <ul className="mt-4 space-y-1.5">
                      {ratingDist.map((d) => (
                        <li key={d.n} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="w-8">{d.n} ★</span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2"><span className="block h-full bg-rating" style={{ width: `${(d.count / reviews.length) * 100}%` }} /></span>
                          <span className="w-5 text-right tabular-nums">{d.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ul className="space-y-4">
                    {reviews.map((r) => (
                      <li key={r.id} className="border-b border-border pb-4 last:border-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">{r.author}</span>
                          <span className="text-xs text-subtle-foreground">{new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-rating" aria-label={`${r.rating} out of 5`}>{"★".repeat(r.rating)}<span className="text-border">{"★".repeat(5 - r.rating)}</span></p>
                        <p className="mt-1.5 text-sm text-muted-foreground">{r.body}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <EmptyState title="No reviews yet" description="Enrolled learners can leave a review from the learning portal." />
              )}
            </section>

            <section id="faq" className="scroll-mt-32">
              <h2 className="mb-4 text-xl font-bold">Frequently asked questions</h2>
              <Accordion>
                {COURSE_FAQ.map((f) => (
                  <AccordionItem key={f.q} title={f.q}><p className="px-5 py-4 text-sm text-muted-foreground sm:pl-11">{f.a}</p></AccordionItem>
                ))}
              </Accordion>
            </section>
          </div>
        </div>
      </div>

      {related.length ? (
        <section className="border-t border-border bg-surface py-12">
          <div className="container-page">
            <h2 className="mb-6 text-xl font-bold">Related courses</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{related.map((c) => <CourseCard key={c.id} course={c} />)}</div>
          </div>
        </section>
      ) : null}
    </>
  );
}
