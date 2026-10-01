"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Phone/tablet purchase bar for course detail (hidden at ≥1024px, where the sticky card is used).
 * Purely presentational: the price label and CTA (a link to the existing checkout/learn route) are
 * rendered by the server page. A spacer + CSS variable reserve its measured height so the page
 * end and footer links are never covered.
 */
export function MobileBuyBar({ priceLabel, sublabel, cta }: { priceLabel: string; sublabel?: string; cta: ReactNode }) {
  const barRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(80);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const root = el.closest<HTMLElement>(".gc-public");
    const prev = root?.style.getPropertyValue("--gc-buy-bar-height") ?? "";
    const ro = new ResizeObserver(() => {
      const h = Math.ceil(el.getBoundingClientRect().height);
      setHeight(h);
      root?.style.setProperty("--gc-buy-bar-height", `${h}px`);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (prev) root?.style.setProperty("--gc-buy-bar-height", prev);
      else root?.style.removeProperty("--gc-buy-bar-height");
    };
  }, []);

  return (
    <>
      <div aria-hidden className="lg:hidden" style={{ height }} />
      <div ref={barRef} data-gc-buy-bar className="glass-strong safe-inline safe-bottom fixed inset-x-0 bottom-0 z-30 border-t pt-3 shadow-elevated lg:hidden">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)] items-center gap-4">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{sublabel ?? "Course price"}</p>
            <p className="text-lg font-bold tabular-nums">{priceLabel}</p>
          </div>
          {cta}
        </div>
      </div>
    </>
  );
}
