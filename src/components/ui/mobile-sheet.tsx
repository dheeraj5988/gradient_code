"use client";
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Focus goes back here when the sheet closes. */
  returnFocusRef?: RefObject<HTMLElement | null>;
  /** The sheet closes itself once the viewport reaches this width (the desktop UI takes over). */
  desktopMin: 1024 | 1280;
  side?: "left" | "bottom";
  /** Optional sticky footer (e.g. auth actions); defaults to none. */
  footer?: ReactNode;
  id?: string;
};

/**
 * Accessible mobile drawer/sheet built on the native <dialog> (showModal gives focus containment,
 * background inertness and Escape). Portaled to <body> so a blurred/sticky ancestor can't trap it.
 * Closes on navigation, on reaching the desktop breakpoint, on Escape and on backdrop click.
 */
export function MobileSheet({ open, onClose, title, children, returnFocusRef, desktopMin, side = "left", footer, id }: Props) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const pathname = usePathname();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => setMounted(true), []);

  // Open / close the native dialog, lock page scroll while open, restore focus afterwards.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d || !open) return;
    const prevOverflow = document.body.style.overflow;
    if (!d.open) d.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      if (d.open) d.close();
      document.body.style.overflow = prevOverflow;
      const t = returnFocusRef?.current;
      if (t && t.isConnected && t.offsetParent !== null) t.focus();
    };
  }, [open, mounted, returnFocusRef]);

  // Close when the route changes (e.g. browser Back while open).
  const firstPath = useRef(pathname);
  useEffect(() => {
    if (pathname !== firstPath.current) { firstPath.current = pathname; onCloseRef.current(); }
  }, [pathname]);

  // Close once the desktop layout takes over.
  useEffect(() => {
    if (!open) return;
    const mq = window.matchMedia(`(min-width: ${desktopMin}px)`);
    const check = () => { if (mq.matches) onCloseRef.current(); };
    check();
    mq.addEventListener("change", check);
    return () => mq.removeEventListener("change", check);
  }, [open, desktopMin]);

  if (!mounted || !open) return null;
  return createPortal(
    <dialog
      ref={dialogRef}
      id={id}
      aria-labelledby={titleId}
      onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClose={() => onCloseRef.current()}
      onClick={(e) => {
        // Backdrop click, or a link inside was followed (incl. query-only filter links) → close.
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest("a[href]")) onClose();
      }}
      className={cn(
        "gc-public gc-sheet glass-strong fixed m-0 max-w-none border border-hairline p-0 text-foreground shadow-elevated",
        side === "bottom"
          ? "inset-x-0 top-auto bottom-0 max-h-[90dvh] w-full rounded-t-xl"
          : "inset-y-0 left-0 right-auto h-dvh max-h-dvh w-[min(24rem,100%)]",
      )}
    >
      <div className={cn("flex flex-col motion-safe:animate-drawer-in", side === "bottom" ? "max-h-[90dvh] motion-safe:animate-sheet-in" : "h-dvh max-h-dvh")}>
        <header className="flex shrink-0 items-center gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)]">
          <h2 id={titleId} className="min-w-0 flex-1 py-3 font-semibold break-words">{title}</h2>
          <button ref={closeRef} type="button" aria-label={`Close ${title}`} onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground">
            <X aria-hidden className="h-5 w-5" />
          </button>
        </header>
        <div className="safe-inline min-h-0 flex-1 overflow-y-auto overscroll-contain py-4">{children}</div>
        {footer ? <footer className="safe-inline safe-bottom shrink-0 border-t border-border pt-3">{footer}</footer> : null}
      </div>
    </dialog>,
    document.body,
  );
}
