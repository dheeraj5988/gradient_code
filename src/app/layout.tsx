import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";
import "@fontsource-variable/jetbrains-mono";
import { DemoBanner } from "@/components/demo-banner";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Gradient Code — Learn by shipping", template: "%s · Gradient Code" },
  description: "Industry-led courses in full stack, data science, AI and cloud — with real projects, certificates and internships.",
  openGraph: { siteName: "Gradient Code", type: "website" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
