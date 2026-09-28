import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { QuestionForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "Edit question" };

export default async function EditQuestion({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id } = await params;
  const { created } = await searchParams;
  const [{ data: q }, { data: key }, scope] = await Promise.all([
    ctx.supabase.from("practice_questions").select("*").eq("id", id).maybeSingle(),
    ctx.supabase.from("practice_answer_keys").select("*").eq("question_id", id).maybeSingle(),
    loadScope(ctx, { topics: true, lessons: true }),
  ]);
  if (!q) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title={q.title} crumbs={[{ label: "Questions", href: "/admin/questions" }, { label: q.title }]} />
      {created ? <p role="status" className="mb-4 rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-sm text-success">Question created{q.is_published ? " and published" : " as a draft"}.</p> : null}
      <QuestionForm q={q} keyRow={key} scope={scope} />
    </div>
  );
}
