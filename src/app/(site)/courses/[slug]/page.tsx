import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, Briefcase, Check, Clock, Download, FileText, Globe, Infinity as InfinityIcon, RefreshCw, Smartphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Rating } from "@/components/rating";
import { CourseThumb } from "@/components/course-thumb";
import { Curriculum } from "@/components/course/curriculum";
import { getCourseBySlug, getCurriculum, getReviews, isEnrolled } from "@/lib/data/queries";
import { getUser } from "@/lib/supabase/server";
import { discountPercent, formatCount, formatPrice } from "@/lib/utils";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const c = await getCourseBySlug((await params).slug);
  if (!c) return {};
  return { title: c.title, description: c.subtitle ?? c.description.slice(0, 160), openGraph: { images: c.thumbnail_url ? [c.thumbnail_url] : [] } };
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const course = await getCourseBySlug(slug);
  if (!course) notFound();
  const user = await getUser();
  const [modules, reviews, enrolled] = await Promise.all([
    getCurriculum(course.id),
    getReviews(course.id),
    user ? isEnrolled(user.id, course.id) : Promise.resolve(false),
  ]);
  const off = discountPercent(course.price, course.mrp);
  const lessonCount = modules.reduce((s, m) => s + m.lessons.length, 0);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: course.title,
    description: course.subtitle ?? course.description,
    provider: { "@type": "Organization", name: "Gradient Code", sameAs: process.env.NEXT_PUBLIC_SITE_URL },
    offers: { "@type": "Offer", price: course.price, priceCurrency: "INR", category: course.price ? "Paid" : "Free" },
    ...(course.rating_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: course.rating_avg, ratingCount: course.rating_count } } : {}),
  };

  const includes = [
    course.includes.hours && { icon: Clock, text: `${course.includes.hours} hours on-demand video` },
    course.includes.articles && { icon: FileText, text: `${course.includes.articles} articles & notes` },
    course.includes.resources && { icon: Download, text: `${course.includes.resources} downloadable resources` },
    { icon: course.access_policy === "lifetime" ? InfinityIcon : RefreshCw, text: course.access_policy === "lifetime" ? "Full lifetime access" : `${course.access_days} days access` },
    { icon: Smartphone, text: "Access on mobile and desktop" },
    course.includes.certificate !== false && { icon: Award, text: "Certificate of completion" },
    course.has_internship && { icon: Briefcase, text: "Internship eligibility" },
  ].filter(Boolean) as { icon: typeof Clock; text: string }[];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Dark hero band (Udemy pattern) */}
      <section className="border-b border-border bg-surface">
        <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <nav className="text-xs text-muted-foreground">
              <Link href="/courses" className="hover:underline">Courses</Link> ›{" "}
              <Link href={`/courses?track=${encodeURIComponent(course.track)}`} className="hover:underline">{course.track}</Link>
            </nav>
            <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{course.title}</h1>
            {course.subtitle ? <p className="text-lg text-muted-foreground">{course.subtitle}</p> : null}
            <div className="flex flex-wrap items-center gap-3 text-sm">
              {course.is_featured ? <Badge tone="warning">Bestseller</Badge> : null}
              <Rating value={course.rating_avg} count={course.rating_count} />
              {course.students_count ? <span className="text-muted-foreground">{formatCount(course.students_count)} learners</span> : null}
            </div>
            {course.instructor ? (
              <p className="text-sm">
                Created by{" "}
                {course.instructor.slug ? (
                  <Link href={`/instructors/${course.instructor.slug}`} className="text-brand-pink underline">{course.instructor.name}</Link>
                ) : course.instructor.name}
              </p>
            ) : null}
            <p className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Globe className="h-4 w-4" />{course.language}</span>
              <span>{course.level}</span>
              <span>Updated {new Date(course.updated_at).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-12 lg:order-1">
          {course.what_you_learn.length ? (
            <section className="rounded-2xl border border-border p-6">
              <h2 className="mb-4 text-2xl font-bold">What you&apos;ll learn</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {course.what_you_learn.map((w) => (
                  <li key={w} className="flex gap-2.5 text-sm"><Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />{w}</li>
                ))}
              </ul>
            </section>
          ) : null}

          {course.skills.length ? (
            <section>
              <h2 className="mb-3 text-xl font-bold">Skills you&apos;ll gain</h2>
              <div className="flex flex-wrap gap-2">{course.skills.map((s) => <Badge key={s} className="px-3 py-1 text-sm">{s}</Badge>)}</div>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-2xl font-bold">Course content</h2>
            {modules.length ? <Curriculum modules={modules} /> : <p className="text-muted-foreground">Curriculum coming soon.</p>}
          </section>

          {course.requirements.length ? (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Requirements</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{course.requirements.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-3 text-2xl font-bold">Description</h2>
            <div className="space-y-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{course.description}</div>
          </section>

          {course.target_audience.length ? (
            <section>
              <h2 className="mb-3 text-2xl font-bold">Who this course is for</h2>
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{course.target_audience.map((r) => <li key={r}>{r}</li>)}</ul>
            </section>
          ) : null}

          <section>
            <h2 className="mb-4 text-2xl font-bold">Learner reviews</h2>
            {reviews.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <article key={r.id} className="rounded-2xl border border-border p-5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold">{r.author}</span>
                      <Rating value={r.rating} />
                    </div>
                    <p className="text-sm text-muted-foreground">{r.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No reviews yet — enrolled learners can review after starting the course.</p>
            )}
          </section>
        </div>

        {/* Sticky buy box */}
        <aside className="order-first lg:order-2 lg:-mt-64">
          <div className="sticky top-20 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <CourseThumb src={course.thumbnail_url} title={course.title} track={course.track} />
            <div className="space-y-4 p-6">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{formatPrice(course.price)}</span>
                {off ? (
                  <>
                    <span className="text-muted-foreground line-through">{formatPrice(course.mrp!)}</span>
                    <span className="text-sm font-semibold text-success">{off}% off</span>
                  </>
                ) : null}
              </div>
              {enrolled ? (
                <ButtonLink href={`/learn/${course.slug}`} size="lg" className="w-full">Go to course</ButtonLink>
              ) : (
                <>
                  <ButtonLink href={course.price ? `/checkout/${course.slug}` : `/checkout/${course.slug}?free=1`} size="lg" className="w-full">
                    {course.price ? "Buy now" : "Enroll for free"}
                  </ButtonLink>
                  <ButtonLink href={`/learn/${course.slug}?preview=1`} variant="outline" className="w-full">Preview free lesson</ButtonLink>
                </>
              )}
              <p className="text-center text-xs text-muted-foreground">7-day refund policy · Secure payment via Razorpay</p>
              <div>
                <h3 className="mb-2 text-sm font-semibold">This course includes</h3>
                <ul className="space-y-2 text-sm">
                  {includes.map((i) => <li key={i.text} className="flex items-center gap-2.5 text-muted-foreground"><i.icon className="h-4 w-4" />{i.text}</li>)}
                  <li className="flex items-center gap-2.5 text-muted-foreground"><FileText className="h-4 w-4" />{lessonCount} lessons</li>
                </ul>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
