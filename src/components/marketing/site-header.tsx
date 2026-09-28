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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2">Skip to content</a>
      <div className="container-page flex h-16 items-center gap-4 lg:gap-8">
        <Logo />
        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {PRIMARY_NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <form action="/courses" role="search" className="relative ml-auto hidden w-full max-w-xs md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <input
            name="q"
            placeholder="Search courses"
            aria-label="Search courses"
            className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm placeholder:text-subtle-foreground focus:border-primary focus:bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          {user ? (
            <ButtonLink href="/dashboard" size="sm">My learning</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Get started</ButtonLink>
            </>
          )}
          <MobileNav signedIn={!!user} />
        </div>
      </div>
    </header>
  );
}
