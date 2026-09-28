"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, Briefcase, Compass, LayoutDashboard, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My courses", icon: BookOpen },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/applications", label: "Applications", icon: Briefcase },
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/courses", label: "Explore courses", icon: Compass },
];

export function SidebarNav() {
  const path = usePathname();
  return (
    <nav aria-label="Dashboard">
      <ul className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:px-3 lg:pb-0">
        {NAV.map((n) => {
          const active = n.href === "/dashboard" ? path === n.href : path.startsWith(n.href);
          return (
            <li key={n.href} className="shrink-0">
              <Link
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary-soft text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
                )}
              >
                <n.icon className="h-4 w-4" aria-hidden />{n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
