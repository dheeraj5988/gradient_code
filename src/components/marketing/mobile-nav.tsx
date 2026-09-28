"use client";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

const LINKS = [
  { href: "/courses", label: "Courses" },
  { href: "/courses?crash=1", label: "Crash Courses" },
  { href: "/internships", label: "Internships" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/login", label: "Log in" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label="Open menu" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2">
        <Menu className="h-5 w-5" />
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur" role="dialog" aria-modal>
          <div className="flex h-16 items-center justify-end px-4">
            <button aria-label="Close menu" onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-surface-2">
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex flex-col gap-1 px-6">
            <form action="/courses" className="mb-4" onSubmit={() => setOpen(false)}>
              <input name="q" placeholder="Search courses" className="h-11 w-full rounded-xl border border-border bg-surface px-4 text-sm" />
            </form>
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-lg font-medium hover:bg-surface-2">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
