import type { Viewport } from "next";

export const viewport: Viewport = { viewportFit: "cover" };

/** Checkout + result pages share the public visual scope (44px targets, 16px inputs, safe areas). */
export default function CheckoutLayout({ children }: { children: React.ReactNode }) {
  return <div className="gc-public min-h-dvh">{children}</div>;
}
