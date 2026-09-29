import { AdminHeader } from "@/components/admin/table";
import { InternshipForm } from "@/components/admin/internship-form";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";

export const metadata = { title: "New internship" };

export default async function NewInternship() {
  const ctx = (await requireAdminPage())!;
  const courses = await courseOptions(ctx);
  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title="New internship" crumbs={[{ label: "Internships", href: "/admin/internships" }, { label: "New" }]} />
      <InternshipForm courses={courses} />
    </div>
  );
}
