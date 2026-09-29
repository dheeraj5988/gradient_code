import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund policy" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage slug="refund" fallbackTitle="Refund policy" />;
}
