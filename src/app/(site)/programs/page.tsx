import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Programs", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Programs" description="Career programs bundle several courses, projects and assessments into one structured path." />;
}
