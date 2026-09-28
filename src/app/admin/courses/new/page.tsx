import { AdminHeader } from "@/components/admin/table";
import { CourseForm } from "@/components/admin/course-form";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "New course" };

export default async function NewCourse() {
  const ctx = (await requireAdminPage())!;
  const { data: instructors } = await ctx.supabase.from("instructors").select("id,name").order("name");
  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title="New course" crumbs={[{ label: "Courses", href: "/admin/courses" }, { label: "New" }]} />
      <CourseForm instructors={instructors ?? []} />
    </div>
  );
}
