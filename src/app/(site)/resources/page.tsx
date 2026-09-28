import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Resources", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Resources" description="Notes, cheat sheets, templates and reference material for every course." />;
}
