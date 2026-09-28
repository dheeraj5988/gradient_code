"use client";
import { useState } from "react";
import { AdminForm, Checkbox, SelectInput, SubmitButton, TextArea, TextInput } from "./form";
import { saveLesson } from "@/app/admin/courses/curriculum-actions";

/* eslint-disable @typescript-eslint/no-explicit-any */
const fmt = (s: number) => (s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "");

export function LessonForm({ courseId, lesson, modules, driveConfigured }: { courseId: string; lesson: any; modules: { id: string; title: string }[]; driveConfigured: boolean }) {
  const [type, setType] = useState<string>(lesson.type);
  const initialProvider = lesson.type !== "video" || (!lesson.video_url && !lesson.drive_file_id) ? "none" : lesson.video_provider === "drive" || lesson.drive_file_id ? "drive" : lesson.video_provider;
  const [provider, setProvider] = useState<string>(initialProvider);
  const source = lesson.drive_file_id ?? lesson.video_url ?? "";
  return (
    <AdminForm action={saveLesson.bind(null, courseId, lesson.id)}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <div className="md:col-span-2"><TextInput name="title" label="Title" required defaultValue={lesson.title} maxLength={200} /></div>
        <SelectInput name="module_id" label="Module" required defaultValue={lesson.module_id} options={modules.map((m) => [m.id, m.title])} />
        <div>
          <label htmlFor="f-type" className="mb-1.5 block text-sm font-medium">Type</label>
          <select id="f-type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="video">Video</option><option value="text">Reading</option><option value="live">Live session</option>
          </select>
        </div>
        <TextInput name="slug" label="Slug" defaultValue={lesson.slug} hint="Optional; generated from the title." />
        <TextInput name="duration" label="Duration" defaultValue={fmt(lesson.duration_seconds)} placeholder="12 or 12:30" hint="Minutes, mm:ss or hh:mm:ss." />
        <div className="md:col-span-2"><TextArea name="description" label="Short description" rows={2} defaultValue={lesson.description} /></div>
      </section>

      {type === "video" ? (
        <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
          <h2 className="text-sm font-semibold md:col-span-2">Video</h2>
          <div>
            <label htmlFor="f-video_provider" className="mb-1.5 block text-sm font-medium">Provider</label>
            <select id="f-video_provider" name="video_provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
              <option value="none">No video yet</option>
              <option value="drive">Google Drive (private, streamed)</option>
              <option value="youtube">YouTube</option>
              <option value="vimeo">Vimeo</option>
              <option value="html5">Direct video file URL (.mp4 / .webm)</option>
              <option value="external">Other embed URL</option>
            </select>
          </div>
          {provider !== "none" ? (
            <TextInput name="video_source" label={provider === "drive" ? "Drive file ID or URL" : "Video URL"} defaultValue={provider === initialProvider ? source : ""} hint={provider === "drive" ? (driveConfigured ? "Streamed through /api/video after an access check." : "Drive credentials are not configured — the lesson falls back to the Drive preview player.") : "Must start with https://"} />
          ) : null}
          {lesson.drive_name || lesson.drive_size ? (
            <p className="text-xs text-muted-foreground md:col-span-2">Drive file: {lesson.drive_name ?? "—"}{lesson.drive_size ? ` · ${(Number(lesson.drive_size) / 1e6).toFixed(1)} MB` : ""}{lesson.drive_mime_type ? ` · ${lesson.drive_mime_type}` : ""}</p>
          ) : null}
        </section>
      ) : null}
      {type === "live" ? (
        <section className="rounded-xl border border-border bg-card p-5"><TextInput name="join_url" label="Join link" defaultValue={lesson.join_url} placeholder="https://" /></section>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5">
        <TextArea name="content_text" label={type === "text" ? "Reading content" : "Lesson notes (shown under the video)"} rows={8} defaultValue={lesson.content_text} />
      </section>

      <section className="grid gap-3 rounded-xl border border-border bg-card p-5 md:grid-cols-3">
        <Checkbox name="is_published" label="Published" hint="Unpublished lessons are hidden from learners." defaultChecked={lesson.is_published} />
        <Checkbox name="is_free_preview" label="Free preview" hint="Anyone can watch this lesson." defaultChecked={lesson.is_free_preview} />
        <Checkbox name="is_required" label="Required for completion" defaultChecked={lesson.is_required} />
      </section>
      <SubmitButton>Save lesson</SubmitButton>
    </AdminForm>
  );
}
