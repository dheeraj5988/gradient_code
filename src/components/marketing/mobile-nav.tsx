"use client";
import Link from "next/link";
import { Menu, Search } from "lucide-react";
import { useRef, useState } from "react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { PRIMARY_NAV } from "./nav";

export function MobileNav({ signedIn }: { signedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = () => setOpen(false);

  return (
    <div className="xl:hidden">
      <button ref={triggerRef} type="button" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={open} aria-controls="site-menu" onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2">
        <Menu className="h-5 w-5" aria-hidden />
      </button>
      <MobileSheet
        id="site-menu"
        open={open}
        onClose={close}
        title="Menu"
        desktopMin={1280}
        returnFocusRef={triggerRef}
        footer={
          <div className="grid gap-2">
            {signedIn ? (
              <Link href="/dashboard" onClick={close} className="grid min-h-11 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">My learning</Link>
            ) : (
              <>
                <Link href="/signup" onClick={close} className="grid min-h-11 place-items-center rounded-lg bg-primary font-semibold text-primary-foreground">Get started</Link>
                <Link href="/login" onClick={close} className="grid min-h-11 place-items-center rounded-lg border border-border-strong font-semibold">Log in</Link>
              </>
            )}
          </div>
        }
      >
        <form action="/courses" role="search" onSubmit={close} className="relative mb-4">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <input name="q" placeholder="Search courses" aria-label="Search courses" className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-base" />
        </form>
        <nav aria-label="Mobile">
          <ul className="divide-y divide-border">
            {PRIMARY_NAV.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex min-h-12 items-center text-base font-medium">{l.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </MobileSheet>
    </div>
  );
}
