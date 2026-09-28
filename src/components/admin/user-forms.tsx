"use client";
import { AdminForm, SelectInput, SubmitButton, TextArea, TextInput } from "./form";
import { grantEnrollment, saveInstructor } from "@/app/admin/user-actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function GrantEnrollmentForm({ courses, defaultStudent }: { courses: { id: string; title: string }[]; defaultStudent?: string }) {
  return (
    <AdminForm action={grantEnrollment} resetOnSuccess className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput name="student" label="Student email" required defaultValue={defaultStudent} placeholder="learner@example.com" />
        <SelectInput name="course_id" label="Course" required options={courses.map((c) => [c.id, c.title])} placeholder="Select a course" />
        <SelectInput name="source" label="Reason" required defaultValue="admin" options={[["admin", "Admin grant"], ["scholarship", "Scholarship"], ["promotion", "Promotion"]]} />
        <TextInput name="expires_at" label="Access until (optional)" type="date" />
        <div className="md:col-span-2"><TextArea name="notes" label="Note" required rows={2} hint="Why access is being granted. Stored in the audit log." /></div>
      </div>
      <SubmitButton>Grant access</SubmitButton>
    </AdminForm>
  );
}

export function InstructorForm({ i }: { i?: any }) {
  return (
    <AdminForm action={saveInstructor.bind(null, i?.id ?? null)} redirectTo={i ? undefined : () => "/admin/instructors"}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <TextInput name="name" label="Name" required defaultValue={i?.name} />
        <TextInput name="slug" label="Slug" defaultValue={i?.slug} hint="Public URL: /instructors/slug" />
        <div className="md:col-span-2"><TextInput name="headline" label="Headline" defaultValue={i?.headline} placeholder="e.g. Cloud Solutions Architect" /></div>
        <div className="md:col-span-2"><TextArea name="bio" label="Bio" rows={5} defaultValue={i?.bio} hint="Use only credentials the instructor has confirmed." /></div>
        <TextInput name="avatar_url" label="Photo URL" defaultValue={i?.avatar_url} placeholder="https://" />
        <TextInput name="linkedin_url" label="LinkedIn URL" defaultValue={i?.linkedin_url} placeholder="https://" />
        <TextInput name="website_url" label="Website" defaultValue={i?.website_url} placeholder="https://" />
      </section>
      <SubmitButton>{i ? "Save instructor" : "Add instructor"}</SubmitButton>
    </AdminForm>
  );
}
