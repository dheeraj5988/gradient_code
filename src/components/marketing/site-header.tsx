import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { getUser } from "@/lib/supabase/server";
import { MobileNav } from "./mobile-nav";

export const NAV = [
  { href: "/courses", label: "Courses" },
  { href: "/courses?crash=1", label: "Crash Courses" },
  { href: "/internships", label: "Internships" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
];

export async function SiteHeader() {
  const user = await getUser();
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <form action="/courses" className="relative hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            name="q"
            placeholder="What do you want to learn?"
            aria-label="Search courses"
            className="h-10 w-full rounded-full border border-border bg-surface pr-4 pl-10 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </form>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="rounded-full px-3 py-2 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          {user ? (
            <ButtonLink href="/dashboard" size="sm">My learning</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">Log in</ButtonLink>
              <ButtonLink href="/signup" size="sm">Join free</ButtonLink>
            </>
          )}
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
