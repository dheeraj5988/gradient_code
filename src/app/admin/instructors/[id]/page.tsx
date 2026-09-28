import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { InstructorForm } from "@/components/admin/user-forms";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "Edit instructor" };

export default async function EditInstructor({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const { data } = await ctx.supabase.from("instructors").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <div className="mx-auto max-w-3xl"><AdminHeader title={data.name} crumbs={[{ label: "Instructors", href: "/admin/instructors" }, { label: data.name }]} /><InstructorForm i={data} /></div>;
}
