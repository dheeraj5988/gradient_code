"use client";
import { useState } from "react";
import { fieldClass } from "@/components/ui/input";

export type ScopeData = {
  courses: { id: string; title: string }[];
  modules: { id: string; course_id: string; title: string }[];
  topics?: { id: string; course_id: string; name: string }[];
  lessons?: { id: string; course_id: string; title: string }[];
};

/** Course → module → topic → lesson selects, filtered by the chosen course. */
export function ScopePicker({ data, initial, show = ["module"] }: { data: ScopeData; initial: { course_id?: string | null; module_id?: string | null; topic_id?: string | null; lesson_id?: string | null }; show?: ("module" | "topic" | "lesson")[] }) {
  const [course, setCourse] = useState(initial.course_id ?? "");
  const sel = (id: string, label: string, name: string, opts: [string, string][], def?: string | null) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}</label>
      <select id={id} name={name} key={`${name}-${course}`} defaultValue={def ?? ""} className={fieldClass} disabled={!course}>
        <option value="">None</option>
        {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <>
      <div>
        <label htmlFor="f-course_id" className="mb-1.5 block text-sm font-medium">Course<span className="text-danger" aria-hidden> *</span></label>
        <select id="f-course_id" name="course_id" value={course} onChange={(e) => setCourse(e.target.value)} className={fieldClass}>
          <option value="">Select a course</option>
          {data.courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </div>
      {show.includes("module") ? sel("f-module_id", "Module", "module_id", data.modules.filter((m) => m.course_id === course).map((m) => [m.id, m.title]), initial.course_id === course ? initial.module_id : null) : null}
      {show.includes("topic") ? sel("f-topic_id", "Topic", "topic_id", (data.topics ?? []).filter((t) => t.course_id === course).map((t) => [t.id, t.name]), initial.course_id === course ? initial.topic_id : null) : null}
      {show.includes("lesson") ? sel("f-lesson_id", "Related lesson", "lesson_id", (data.lessons ?? []).filter((l) => l.course_id === course).map((l) => [l.id, l.title]), initial.course_id === course ? initial.lesson_id : null) : null}
    </>
  );
}
