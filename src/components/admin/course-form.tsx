"use client";
import { useState } from "react";
import { AdminForm, Checkbox, SelectInput, SubmitButton, TextArea, TextInput } from "./form";
import { saveCourse } from "@/app/admin/courses/actions";
import { slugify } from "@/lib/admin/util";

/* eslint-disable @typescript-eslint/no-explicit-any */
const CATEGORIES = ["Full Stack Development", "Data Science & AI", "Data Analytics", "Artificial Intelligence", "Machine Learning", "Cloud & DevOps", "Cybersecurity", "Programming", "UI/UX & Product Design"];

export function CourseForm({ course, instructors }: { course?: any; instructors: { id: string; name: string }[] }) {
  const [title, setTitle] = useState<string>(course?.title ?? "");
  const [slugTouched, setSlugTouched] = useState(!!course);
  const [slug, setSlug] = useState<string>(course?.slug ?? "");
  const cats = [...new Set([...CATEGORIES, ...(course?.track ? [course.track] : [])])];
  const inc = course?.includes ?? {};
  return (
    <AdminForm action={saveCourse.bind(null, course?.id ?? null)} redirectTo={course ? undefined : (d) => `/admin/courses/${(d as { id: string }).id}/edit?created=1`}>
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Basics</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="f-title" className="mb-1.5 block text-sm font-medium">Title<span className="text-danger" aria-hidden> *</span></label>
            <input id="f-title" name="title" required value={title} maxLength={160} onChange={(e) => { setTitle(e.target.value); if (!slugTouched) setSlug(slugify(e.target.value)); }} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label htmlFor="f-slug" className="mb-1.5 block text-sm font-medium">URL slug<span className="text-danger" aria-hidden> *</span></label>
            <input id="f-slug" name="slug" value={slug} onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }} className="h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <p className="mt-1 text-xs text-muted-foreground">/courses/{slug || "…"}{course ? " — changing this breaks existing links." : ""}</p>
          </div>
          <SelectInput name="track" label="Category" required defaultValue={course?.track} options={cats.map((c) => [c, c])} placeholder="Select a category" />
          <div className="md:col-span-2"><TextInput name="subtitle" label="Short description" defaultValue={course?.subtitle} maxLength={200} hint="One line shown under the title and on course cards." /></div>
          <div className="md:col-span-2"><TextArea name="description" label="Description" rows={6} defaultValue={course?.description} hint="At least 80 characters before publishing." /></div>
          <TextInput name="thumbnail_url" label="Thumbnail URL" defaultValue={course?.thumbnail_url} placeholder="https://…" hint="16:9 image. Leave empty to use the default card design." />
          <SelectInput name="instructor_id" label="Instructor" defaultValue={course?.instructor_id} options={instructors.map((i) => [i.id, i.name])} placeholder="No instructor" />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Details</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput name="level" label="Level" required defaultValue={course?.level ?? "Beginner"} options={["Beginner", "Intermediate", "Advanced", "All levels"].map((l) => [l, l])} />
          <TextInput name="language" label="Language" defaultValue={course?.language ?? "English"} />
          <TextInput name="hours" label="Video hours" type="number" min={0} step="0.5" defaultValue={inc.hours} />
          <TextInput name="projects" label="Number of projects" type="number" min={0} defaultValue={inc.projects} />
          <div className="md:col-span-2"><TextInput name="skills" label="Skills (comma separated)" defaultValue={(course?.skills ?? []).join(", ")} /></div>
          <TextArea name="what_you_learn" label="What you'll learn (one per line)" rows={6} defaultValue={(course?.what_you_learn ?? []).join("\n")} />
          <TextArea name="requirements" label="Requirements (one per line)" rows={6} defaultValue={(course?.requirements ?? []).join("\n")} />
          <TextArea name="target_audience" label="Who it's for (one per line)" rows={6} defaultValue={(course?.target_audience ?? []).join("\n")} />
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="mb-4 text-sm font-semibold">Pricing & access</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <TextInput name="price" label="Price (₹)" type="number" min={0} required defaultValue={course?.price ?? 0} hint="0 = free course" />
          <TextInput name="mrp" label="Original price (₹)" type="number" min={0} defaultValue={course?.mrp} hint="Only if genuinely discounted." />
          <SelectInput name="access_policy" label="Access" defaultValue={course?.access_policy ?? "lifetime"} options={[["lifetime", "Lifetime"], ["days", "Limited days"]]} />
          <TextInput name="access_days" label="Access days" type="number" min={1} defaultValue={course?.access_days} />
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <Checkbox name="certificate_enabled" label="Certificate enabled" defaultChecked={inc.certificate !== false} />
          <Checkbox name="has_internship" label="Internship pathway" defaultChecked={course?.has_internship} />
          <Checkbox name="is_featured" label="Featured on homepage" defaultChecked={course?.is_featured} />
          <Checkbox name="is_crash_course" label="Short course" defaultChecked={course?.is_crash_course} />
          <Checkbox name="is_demo" label="Demo / test course" hint="Hidden from the public catalog even when published." defaultChecked={course?.is_demo} />
        </div>
      </section>

      <div className="flex items-center gap-3">
        <SubmitButton>{course ? "Save changes" : "Create draft course"}</SubmitButton>
        {!course ? <p className="text-xs text-muted-foreground">New courses start as drafts and are not visible to learners.</p> : null}
      </div>
    </AdminForm>
  );
}
