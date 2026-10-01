"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { LogOut, Menu } from "lucide-react";
import { MobileSheet } from "@/components/ui/mobile-sheet";
import { cn } from "@/lib/utils";
import { NAV } from "./sidebar-nav";

const isActive = (href: string, path: string) => (href === "/dashboard" ? path === href : path.startsWith(href));

/** Phone/tablet dashboard navigation: a menu button naming the current page, opening all destinations. */
export function DashboardMobileNav({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const current = NAV.find((n) => isActive(n.href, path))?.label ?? "Menu";
  return (
    <>
      <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-controls="dashboard-menu" className="inline-flex h-11 min-w-0 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium">
        <Menu className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{current}</span>
      </button>
      <MobileSheet
        id="dashboard-menu"
        open={open}
        onClose={() => setOpen(false)}
        title="My learning"
        desktopMin={1024}
        returnFocusRef={triggerRef}
        footer={
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{name}</p>
            <form action="/auth/signout" method="post">
              <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
            </form>
          </div>
        }
      >
        <nav aria-label="Dashboard">
          <ul className="space-y-1">
            {NAV.map((n) => {
              const active = isActive(n.href, path);
              return (
                <li key={n.href}>
                  <Link href={n.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-12 items-center gap-3 rounded-lg px-3 text-base font-medium", active ? "bg-primary-soft text-primary" : "text-foreground hover:bg-surface-2")}>
                    <n.icon className="h-5 w-5" aria-hidden />{n.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </MobileSheet>
    </>
  );
}
