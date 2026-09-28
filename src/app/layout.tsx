import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/jetbrains-mono";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: "Gradient Code — Practical courses, projects and internships", template: "%s | Gradient Code" },
  description: "Industry-oriented courses and programs that help students build practical technical skills and prove them through projects and assessments.",
  alternates: { canonical: "/" },
  openGraph: { siteName: "Gradient Code", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
