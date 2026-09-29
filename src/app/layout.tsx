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
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  openGraph: { siteName: "Gradient Code", type: "website", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1120" },
  ],
};

// Runs before first paint so the page never flashes the wrong theme.
// Priority: saved choice -> system preference -> light.
const THEME_SCRIPT = `try{var t=localStorage.getItem("gc-theme");var d=t?t==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} /></head>
      <body className="min-h-screen">
        <DemoBanner />
        {children}
      </body>
    </html>
  );
}
