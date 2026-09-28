import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/table";
import { LessonForm } from "@/components/admin/lesson-form";
import { requireAdminPage } from "@/lib/admin/guard";
import { isDriveConfigured } from "@/lib/google-drive/client";

export const metadata = { title: "Edit lesson" };

export default async function EditLesson({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const ctx = (await requireAdminPage())!;
  const { id, lessonId } = await params;
  const [{ data: course }, { data: lesson }, { data: modules }] = await Promise.all([
    ctx.supabase.from("courses").select("id,title").eq("id", id).maybeSingle(),
    ctx.supabase.from("lessons").select("*").eq("id", lessonId).maybeSingle(),
    ctx.supabase.from("course_modules").select("id,title").eq("course_id", id).order("order_index"),
  ]);
  if (!course || !lesson || !(modules ?? []).some((m) => m.id === lesson.module_id)) notFound();
  return (
    <div className="mx-auto max-w-4xl">
      <AdminHeader title={lesson.title} crumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.title, href: `/admin/courses/${id}/edit` }, { label: "Curriculum", href: `/admin/courses/${id}/curriculum` }, { label: "Lesson" }]} />
      <LessonForm courseId={id} lesson={lesson} modules={modules ?? []} driveConfigured={isDriveConfigured()} />
    </div>
  );
}
