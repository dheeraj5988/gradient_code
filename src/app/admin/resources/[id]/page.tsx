import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { ResourceForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "Edit resource" };

export default async function EditResource({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const [{ data: r }, scope] = await Promise.all([ctx.supabase.from("course_resources").select("*").eq("id", id).maybeSingle(), loadScope(ctx, { lessons: true })]);
  if (!r) notFound();
  return <div className="mx-auto max-w-3xl"><AdminHeader title={r.title} crumbs={[{ label: "Resources", href: "/admin/resources" }, { label: r.title }]} /><ResourceForm r={r} scope={scope} /></div>;
}
