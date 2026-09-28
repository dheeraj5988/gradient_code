import { AdminHeader } from "@/components/admin/table";
import { TopicForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "New topic" };

export default async function NewTopic() {
  const ctx = (await requireAdminPage())!;
  return <div className="mx-auto max-w-3xl"><AdminHeader title="New topic" crumbs={[{ label: "Topics", href: "/admin/topics" }, { label: "New" }]} /><TopicForm scope={await loadScope(ctx)} /></div>;
}
