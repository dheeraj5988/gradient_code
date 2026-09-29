import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { InternshipForm } from "@/components/admin/internship-form";
import { requireAdminPage } from "@/lib/admin/guard";
import { courseOptions } from "@/lib/admin/queries";
import { UUID_RE } from "@/lib/admin/util";

export const metadata = { title: "Edit internship" };
export const dynamic = "force-dynamic";

export default async function EditInternship({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const ctx = (await requireAdminPage())!;
  const [{ data: i }, courses] = await Promise.all([ctx.supabase.from("internships").select("*").eq("id", id).maybeSingle(), courseOptions(ctx)]);
  if (!i) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title={i.title} crumbs={[{ label: "Internships", href: "/admin/internships" }, { label: "Edit" }]} />
      <InternshipForm i={i} courses={courses} />
    </div>
  );
}
