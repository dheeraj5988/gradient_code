import type { Viewport } from "next";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";

// Let content use the full screen on notched phones; safe-area padding is applied per bar.
export const viewport: Viewport = { viewportFit: "cover" };

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="gc-public min-h-dvh">
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </div>
  );
}
