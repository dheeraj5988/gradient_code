import { ThemeToggle } from "@/components/theme-toggle";
import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { MobileNav } from "./mobile-nav";
import { PRIMARY_NAV } from "./nav";

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="glass sticky top-0 z-40 border-b border-border pt-[env(safe-area-inset-top)]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">Skip to content</a>
      <div className="container-page flex h-16 items-center gap-2 xl:gap-5">
        <span className="flex min-h-11 shrink-0 items-center"><Logo /></span>
        <nav aria-label="Primary" className="hidden xl:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/courses" role="search" className="relative ml-auto hidden min-w-0 flex-1 max-w-48 md:block xl:max-w-xs">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <input
            name="q"
            placeholder="Search courses"
            aria-label="Search courses"
            className="h-11 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-base placeholder:text-subtle-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:ml-0 sm:gap-2">
          <ThemeToggle />
          {user ? (
            <ButtonLink href="/dashboard" size="sm" className="hidden sm:inline-flex">My learning</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">Get started</ButtonLink>
            </>
          )}
          <MobileNav signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
