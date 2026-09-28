import { AdminHeader } from "@/components/admin/table";
import { InstructorForm } from "@/components/admin/user-forms";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "Add instructor" };

export default async function NewInstructor() {
  await requireAdminPage();
  return <div className="mx-auto max-w-3xl"><AdminHeader title="Add instructor" crumbs={[{ label: "Instructors", href: "/admin/instructors" }, { label: "New" }]} /><InstructorForm /></div>;
}
