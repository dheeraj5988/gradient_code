import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { HOW_IT_WORKS } from "@/lib/content/site";

export const metadata: Metadata = { title: "About", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return (
    <div className="container-page py-8 sm:py-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "About" }]} />
      <div className="mt-4 max-w-3xl">
        <h1 className="text-3xl font-bold sm:text-4xl">About Gradient Code</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Gradient Code is a practical learning platform for students and early-career developers. We focus on skills you can demonstrate — through projects, assessments and real-world experience — not just videos watched.
        </p>
        <h2 className="mt-10 text-xl font-bold">How we teach</h2>
        <ol className="mt-4 space-y-3">
          {HOW_IT_WORKS.map((s, i) => (
            <li key={s.step} className="flex gap-4 rounded-lg border border-border p-4">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{i + 1}</span>
              <span><strong className="block">{s.step}</strong><span className="text-sm text-muted-foreground">{s.body}</span></span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
