import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Projects", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Projects" description="Hands-on projects you build, submit for review and showcase in your portfolio." />;
}
