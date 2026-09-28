import { AdminHeader } from "@/components/admin/table";
import { QuestionForm } from "@/components/admin/content-forms";
import { requireAdminPage } from "@/lib/admin/guard";
import { loadScope } from "@/lib/admin/scope";

export const metadata = { title: "New question" };

export default async function NewQuestion() {
  const ctx = (await requireAdminPage())!;
  return <div className="mx-auto max-w-4xl"><AdminHeader title="New question" crumbs={[{ label: "Questions", href: "/admin/questions" }, { label: "New" }]} /><QuestionForm scope={await loadScope(ctx, { topics: true, lessons: true })} /></div>;
}
