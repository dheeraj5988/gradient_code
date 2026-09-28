import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course/course-card";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { getInstructor } from "@/lib/data/queries";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const d = await getInstructor(slug);
  return d ? { title: d.instructor.name, description: d.instructor.headline ?? d.instructor.bio.slice(0, 160), alternates: { canonical: `/instructors/${slug}` } } : { title: "Instructor not found" };
}

export default async function InstructorPage({ params }: { params: Params }) {
  const data = await getInstructor((await params).slug);
  if (!data) notFound();
  const { instructor: i, courses } = data;
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Instructors" }, { label: i.name }]} />
      <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-center">
        <span className="grid h-24 w-24 shrink-0 place-items-center rounded-full bg-primary-soft text-3xl font-semibold text-primary">
          {i.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </span>
        <div>
          <p className="text-xs font-semibold tracking-wide text-subtle-foreground uppercase">Instructor</p>
          <h1 className="text-3xl font-bold">{i.name}</h1>
          {i.headline ? <p className="mt-1 text-muted-foreground">{i.headline}</p> : null}
          <p className="mt-2 text-sm text-muted-foreground"><strong className="text-foreground">{courses.length}</strong> course{courses.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <section className="mt-10 max-w-3xl">
        <h2 className="mb-2 text-xl font-bold">About</h2>
        <p className="whitespace-pre-line text-muted-foreground">{i.bio}</p>
      </section>
      {courses.length ? (
        <section className="mt-12">
          <h2 className="mb-6 text-xl font-bold">Courses by {i.name}</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
        </section>
      ) : null}
    </div>
  );
}
