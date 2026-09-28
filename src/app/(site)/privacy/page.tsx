import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Privacy policy", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Privacy policy" description="How Gradient Code collects, uses and protects your data." />;
}
