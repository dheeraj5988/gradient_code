/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { AdminForm, Checkbox, SelectInput, SubmitButton, TextArea, TextInput } from "@/components/admin/form";
import { saveInternship } from "@/app/admin/internships/actions";

export function InternshipForm({ i, courses }: { i?: any; courses: { id: string; title: string }[] }) {
  return (
    <AdminForm action={saveInternship.bind(null, i?.id ?? null)} redirectTo={i ? undefined : () => "/admin/internships"}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <div className="md:col-span-2"><TextInput name="title" label="Title" required defaultValue={i?.title} /></div>
        <TextInput name="slug" label="Slug" defaultValue={i?.slug} hint="Public URL: /internships/slug" />
        <TextInput name="company" label="Company" defaultValue={i?.company ?? "Gradient Code"} />
        <SelectInput name="mode" label="Mode" required defaultValue={i?.mode ?? "Remote"} options={[["Remote", "Remote"], ["Hybrid", "Hybrid"], ["On-site", "On-site"]]} />
        <TextInput name="location" label="Location" defaultValue={i?.location ?? "Remote"} />
        <TextInput name="duration_weeks" label="Duration (weeks)" type="number" min={1} step="1" defaultValue={i?.duration_weeks ?? 8} />
        <TextInput name="openings" label="Openings" type="number" min={1} step="1" defaultValue={i?.openings ?? 1} />
        <TextInput name="stipend_min" label="Stipend from (₹/month)" type="number" min={0} step="1" defaultValue={i?.stipend_min ?? 0} hint="0 = unpaid; shown as such" />
        <TextInput name="stipend_max" label="Stipend up to (₹/month)" type="number" min={0} step="1" defaultValue={i?.stipend_max} hint="Leave empty for a fixed amount" />
        <SelectInput name="required_course_id" label="Required course certificate" defaultValue={i?.required_course_id ?? ""} placeholder="None — open to all learners" options={courses.map((c) => [c.id, c.title])} hint="Applicants must hold a valid certificate for this course." />
        <TextInput name="apply_by" label="Apply by" type="date" defaultValue={i?.apply_by} />
        <div className="md:col-span-2"><TextArea name="description" label="Description" rows={5} defaultValue={i?.description} /></div>
        <TextArea name="responsibilities" label="Responsibilities (one per line)" rows={5} defaultValue={(i?.responsibilities ?? []).join("\n")} />
        <TextArea name="skills" label="Skills (one per line)" rows={5} defaultValue={(i?.skills ?? []).join("\n")} />
        <TextArea name="perks" label="Perks (one per line)" rows={3} defaultValue={(i?.perks ?? []).join("\n")} hint="Only list perks you will actually provide." />
      </section>
      <Checkbox name="is_published" label="Published" hint="Visible on /internships and open for applications." defaultChecked={i?.is_published ?? false} />
      <SubmitButton>{i ? "Save internship" : "Create internship"}</SubmitButton>
    </AdminForm>
  );
}
