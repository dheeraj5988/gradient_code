import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of use" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <LegalPage slug="terms" fallbackTitle="Terms of use" />;
}
