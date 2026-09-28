"use client";
import { useState } from "react";
import { AdminForm, Checkbox, SelectInput, SubmitButton, TextArea, TextInput } from "./form";
import { ScopePicker, type ScopeData } from "./scope-picker";
import { saveQuestion, saveResource, saveTopic } from "@/app/admin/content-actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export function TopicForm({ topic, scope }: { topic?: any; scope: ScopeData }) {
  return (
    <AdminForm action={saveTopic.bind(null, topic?.id ?? null)} redirectTo={topic ? undefined : () => "/admin/topics"}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <ScopePicker data={scope} initial={topic ?? {}} />
        <TextInput name="name" label="Name" required defaultValue={topic?.name} maxLength={120} />
        <TextInput name="slug" label="Slug" defaultValue={topic?.slug} hint="Optional; generated from the name." />
        <TextInput name="order_index" label="Order" type="number" min={0} defaultValue={topic?.order_index ?? 0} />
        <div className="md:col-span-2"><TextArea name="description" label="Description" rows={2} defaultValue={topic?.description} /></div>
      </section>
      <SubmitButton>{topic ? "Save topic" : "Create topic"}</SubmitButton>
    </AdminForm>
  );
}

const QTYPES: [string, string][] = [["mcq", "Multiple choice"], ["multi_select", "Multi-select"], ["true_false", "True / False"], ["short_answer", "Short answer"], ["output_prediction", "Output prediction"], ["coding", "Coding"], ["debugging", "Debugging"], ["scenario", "Scenario / open"]];

export function QuestionForm({ q, keyRow, scope }: { q?: any; keyRow?: any; scope: ScopeData }) {
  const [type, setType] = useState<string>(q?.type ?? "mcq");
  const [category, setCategory] = useState<string>(q?.category ?? "practice");
  const choice = ["mcq", "multi_select", "true_false"].includes(type);
  const text = ["short_answer", "output_prediction"].includes(type);
  return (
    <AdminForm action={saveQuestion.bind(null, q?.id ?? null)} redirectTo={q ? undefined : (d) => `/admin/questions/${(d as { id: string }).id}?created=1`}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <ScopePicker data={scope} initial={q ?? {}} show={["module", "topic", "lesson"]} />
        <div>
          <label htmlFor="f-category" className="mb-1.5 block text-sm font-medium">Used for</label>
          <select id="f-category" name="category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="practice">Practice (graded)</option><option value="interview">Interview prep (self-review)</option>
          </select>
        </div>
        {category === "interview" ? <TextInput name="role" label="Target role" defaultValue={q?.role} placeholder="e.g. Frontend developer" /> : null}
      </section>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-3">
        <div className="md:col-span-3"><TextInput name="title" label="Title" required defaultValue={q?.title} maxLength={200} /></div>
        <div>
          <label htmlFor="f-type" className="mb-1.5 block text-sm font-medium">Type<span className="text-danger" aria-hidden> *</span></label>
          <select id="f-type" name="type" value={type} onChange={(e) => setType(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            {QTYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <SelectInput name="difficulty" label="Difficulty" required defaultValue={q?.difficulty ?? "easy"} options={[["easy", "Easy"], ["medium", "Medium"], ["hard", "Hard"]]} />
        <TextInput name="points" label="Points" type="number" min={0} defaultValue={q?.points ?? 10} />
        <div className="md:col-span-3"><TextArea name="prompt" label="Question" required rows={6} defaultValue={q?.prompt} hint="Separate paragraphs with a blank line. For code/output questions, the second paragraph is shown as code." /></div>
        {choice && type !== "true_false" ? <div className="md:col-span-3"><TextArea name="options" label="Options (one per line)" rows={5} defaultValue={(q?.options ?? []).join("\n")} /></div> : null}
        <TextArea name="hint" label="Hint (shown before answering)" rows={2} defaultValue={q?.hint} />
        <TextInput name="estimated_minutes" label="Estimated minutes" type="number" min={1} defaultValue={q?.estimated_minutes ?? 3} />
        <TextInput name="day_number" label="Day (optional plan grouping)" type="number" min={1} defaultValue={q?.day_number} />
        <TextInput name="slug" label="Slug" defaultValue={q?.slug} hint="Optional." />
        <TextInput name="order_index" label="Order" type="number" min={0} defaultValue={q?.order_index ?? 0} />
      </section>
      <section className="grid gap-4 rounded-xl border border-warning/30 bg-card p-5 md:grid-cols-2">
        <p className="text-sm font-semibold md:col-span-2">Answer key <span className="font-normal text-muted-foreground">— stored separately; learners can never read it before submitting.</span></p>
        {choice && category === "practice" ? <TextInput name="correct_options" label={type === "multi_select" ? "Correct option numbers (e.g. 1,3)" : "Correct option number"} defaultValue={(keyRow?.correct_options ?? []).map((n: number) => n + 1).join(",")} hint={type === "true_false" ? "1 = True, 2 = False" : "Numbered from 1 in the order above."} /> : null}
        {text && category === "practice" ? <TextArea name="accepted_answers" label="Accepted answers (one per line)" rows={3} defaultValue={(keyRow?.accepted_answers ?? []).join("\n")} hint="Compared ignoring case and extra spaces." /> : null}
        <TextArea name="explanation" label="Explanation (shown after submitting)" rows={3} defaultValue={keyRow?.explanation} />
        <TextArea name="solution" label="Reference solution (optional)" rows={3} mono defaultValue={keyRow?.solution} />
      </section>
      <section className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-5">
        <Checkbox name="is_published" label="Published" defaultChecked={q?.is_published ?? false} />
        <Checkbox name="is_required" label="Required for completion" defaultChecked={q?.is_required} />
      </section>
      <SubmitButton>{q ? "Save question" : "Create question"}</SubmitButton>
    </AdminForm>
  );
}

const RTYPES: [string, string][] = [["pdf", "PDF"], ["notes", "Notes"], ["cheat_sheet", "Cheat sheet"], ["external_link", "External link"], ["code_repository", "Code repository"], ["dataset", "Dataset"], ["template", "Template"], ["presentation", "Presentation"], ["recording", "Recording"]];

export function ResourceForm({ r, scope }: { r?: any; scope: ScopeData }) {
  const initialKind = r?.drive_file_id ? "drive" : r?.file_path ? "storage" : "url";
  const [kind, setKind] = useState(initialKind);
  const initialValue = r?.drive_file_id ?? r?.file_path ?? r?.url ?? "";
  return (
    <AdminForm action={saveResource.bind(null, r?.id ?? null)} redirectTo={r ? undefined : () => "/admin/resources"}>
      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 md:grid-cols-2">
        <ScopePicker data={scope} initial={r ?? {}} show={["module", "lesson"]} />
        <TextInput name="title" label="Title" required defaultValue={r?.title} maxLength={200} />
        <SelectInput name="resource_type" label="Type" required defaultValue={r?.resource_type ?? "pdf"} options={RTYPES} />
        <div className="md:col-span-2"><TextArea name="description" label="Description" rows={2} defaultValue={r?.description} /></div>
        <div>
          <label htmlFor="f-source_kind" className="mb-1.5 block text-sm font-medium">Source</label>
          <select id="f-source_kind" name="source_kind" value={kind} onChange={(e) => setKind(e.target.value)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm">
            <option value="url">Public link (https)</option><option value="drive">Private Google Drive file</option><option value="storage">Supabase Storage file</option>
          </select>
        </div>
        <TextInput name="url" label={kind === "drive" ? "Drive file ID or URL" : kind === "storage" ? "Storage path" : "URL"} defaultValue={kind === initialKind ? initialValue : ""} hint={kind === "drive" ? "Served through an access-checked proxy; learners never see the Drive link." : kind === "storage" ? "Path inside the private course-resources bucket." : undefined} />
        <TextInput name="order_index" label="Order" type="number" min={0} defaultValue={r?.order_index ?? 0} />
      </section>
      <section className="flex flex-wrap gap-6 rounded-xl border border-border bg-card p-5">
        <Checkbox name="is_published" label="Published" defaultChecked={r?.is_published ?? false} />
        <Checkbox name="is_downloadable" label="Downloadable" defaultChecked={r?.is_downloadable ?? true} />
      </section>
      <SubmitButton>{r ? "Save resource" : "Create resource"}</SubmitButton>
    </AdminForm>
  );
}
