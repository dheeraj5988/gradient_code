import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { TopicForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "Edit topic" };

export default async function EditTopic({ params }: { params: Promise<{ id: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const { data: topic } = await ctx.supabase.from("course_topics").select("*").eq("id", id).maybeSingle();
  if (!topic) notFound();
  return <div className="mx-auto max-w-3xl"><AdminHeader title={topic.name} crumbs={[{ label: "Topics", href: "/admin/topics" }, { label: topic.name }]} /><TopicForm topic={topic} scope={await loadScope(ctx)} /></div>;
}
