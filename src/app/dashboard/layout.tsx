import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BadgeCheck, LogOut } from "lucide-react";
import { Logo } from "@/components/brand";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { getUser } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  if (user && !user.email_confirmed_at) redirect("/verify-email?reason=required&next=/dashboard"); // defence in depth; middleware does this first
  const name = (user?.user_metadata?.full_name as string) || user?.email || "Demo learner";
  const initials = name.split(/[\s@]/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="border-b border-border bg-background lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-r lg:border-b-0">
        <div className="flex h-16 items-center justify-between px-5">
          <Logo />
          <form action="/auth/signout" method="post" className="lg:hidden">
            <button className="text-xs font-medium text-muted-foreground hover:text-foreground">Sign out</button>
          </form>
        </div>
        <SidebarNav />
        <div className="mt-auto hidden border-t border-border p-4 lg:block">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary-soft text-sm font-semibold text-primary">{initials}</span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 text-sm font-medium"><span className="truncate">{name}</span>{user?.email_confirmed_at ? <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-success" aria-label="Email verified" /> : null}</p>
              <p className="text-xs text-muted-foreground">Learner</p>
            </div>
            <form action="/auth/signout" method="post">
              <button aria-label="Sign out" className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-foreground"><LogOut className="h-4 w-4" /></button>
            </form>
          </div>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}
