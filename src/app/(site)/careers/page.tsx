import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Careers", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Careers" description="Work with us to build practical learning for the next generation of developers." />;
}
