import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Refund policy", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Refund policy" description="When course purchases can be refunded and how to request one." />;
}
