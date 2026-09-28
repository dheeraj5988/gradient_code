import { notFound } from "next/navigation";
import { CourseCard } from "@/components/course/course-card";
import { getInstructor } from "@/lib/data/queries";

export default async function InstructorPage({ params }: { params: Promise<{ slug: string }> }) {
  const data = await getInstructor((await params).slug);
  if (!data) notFound();
  const { instructor: i, courses } = data;
  return (
    <div className="container-page py-12">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="gradient-fill grid h-28 w-28 shrink-0 place-items-center rounded-full font-display text-4xl font-bold">
          {i.name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
        </div>
        <div>
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Instructor</p>
          <h1 className="text-3xl font-bold">{i.name}</h1>
          {i.headline ? <p className="text-muted-foreground">{i.headline}</p> : null}
          <p className="mt-2 text-sm"><strong>{courses.length}</strong> course{courses.length === 1 ? "" : "s"}</p>
        </div>
      </div>
      <section className="mt-10 max-w-3xl"><h2 className="mb-2 text-xl font-bold">About me</h2><p className="whitespace-pre-line text-muted-foreground">{i.bio}</p></section>
      <section className="mt-12">
        <h2 className="mb-6 text-xl font-bold">Courses by {i.name}</h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{courses.map((c) => <CourseCard key={c.id} course={c} />)}</div>
      </section>
    </div>
  );
}
