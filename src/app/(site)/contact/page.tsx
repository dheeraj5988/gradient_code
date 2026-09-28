import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Contact", robots: { index: false } };

export default function Page() {
  return <ComingSoon title="Contact" description="Questions about a course, payment or internship? We're here to help." />;
}
