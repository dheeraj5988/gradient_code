import Link from "next/link";
import { Award, BookOpen, Briefcase, Compass, LayoutDashboard, LogOut, MessageCircle } from "lucide-react";
import { Logo } from "@/components/brand";
import { getUser } from "@/lib/supabase/server";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/courses", label: "My courses", icon: BookOpen },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/applications", label: "Internships", icon: Briefcase },
  { href: "/courses", label: "Explore courses", icon: Compass },
  // TODO(antigravity): forum + support pages (tables forum_questions/forum_answers/messages already exist)
  { href: "/dashboard", label: "Doubt forum (soon)", icon: MessageCircle },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const name = (user?.user_metadata?.full_name as string) || user?.email || "Demo learner";
  return (
    <div className="min-h-screen md:grid md:grid-cols-[250px_1fr]">
      <aside className="border-b border-border bg-surface md:sticky md:top-0 md:h-screen md:border-r md:border-b-0">
        <div className="flex h-16 items-center px-5"><Logo /></div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
          {NAV.map((n) => (
            <Link key={n.label} href={n.href} className="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-surface-2 hover:text-foreground">
              <n.icon className="h-4 w-4" />{n.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 hidden w-[250px] border-t border-border p-4 md:block">
          <p className="truncate text-sm font-medium">{name}</p>
          <form action="/auth/signout" method="post">
            <button className="mt-2 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"><LogOut className="h-3.5 w-3.5" />Sign out</button>
          </form>
        </div>
      </aside>
      <main className="p-5 md:p-10">{children}</main>
    </div>
  );
}
