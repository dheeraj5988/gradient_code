import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage slug="privacy" fallbackTitle="Privacy policy" />;
}
