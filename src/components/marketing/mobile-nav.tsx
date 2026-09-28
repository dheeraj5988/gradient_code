"use client";
import Link from "next/link";
import { Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/brand";
import { PRIMARY_NAV } from "./nav";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2">
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-background" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="flex h-16 items-center justify-between border-b border-border px-4">
            <Logo />
            <button ref={closeRef} aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg hover:bg-surface-2">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <form action="/courses" role="search" onSubmit={() => setOpen(false)} className="relative mb-4">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <input name="q" placeholder="Search courses" aria-label="Search courses" className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm" />
            </form>
            <nav aria-label="Mobile">
              <ul className="divide-y divide-border">
                {PRIMARY_NAV.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} onClick={() => setOpen(false)} className="block py-3.5 text-base font-medium">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="grid gap-2 border-t border-border p-4">
            {signedIn ? (
              <Link href="/dashboard" onClick={() => setOpen(false)} className="grid h-11 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">My learning</Link>
            ) : (
              <>
                <Link href="/signup" onClick={() => setOpen(false)} className="grid h-11 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">Get started</Link>
                <Link href="/login" onClick={() => setOpen(false)} className="grid h-11 place-items-center rounded-lg border border-border-strong font-semibold">Log in</Link>
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
