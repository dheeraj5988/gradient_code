import { SectionHeading } from "@/components/brand";

export const metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="container-page py-16">
      <SectionHeading eyebrow="About" title="We teach thinking, not just syntax" subtitle="Gradient Code is a project-first learning platform. Every path maps a clear route from where you are to where you want to be." />
      {/* TODO(antigravity): port About content from the old site (src/routes/about.tsx) */}
    </div>
  );
}
