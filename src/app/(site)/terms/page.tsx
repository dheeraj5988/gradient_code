import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Terms of use", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Terms of use" description="The terms that govern your use of Gradient Code." />;
}
