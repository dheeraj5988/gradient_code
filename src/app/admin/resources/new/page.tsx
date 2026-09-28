import { AdminHeader } from "@/components/admin/table";
import { ResourceForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "New resource" };

export default async function NewResource() {
  const ctx = (await requireAdminPage())!;
  return <div className="mx-auto max-w-3xl"><AdminHeader title="New resource" crumbs={[{ label: "Resources", href: "/admin/resources" }, { label: "New" }]} /><ResourceForm scope={await loadScope(ctx, { lessons: true })} /></div>;
}
