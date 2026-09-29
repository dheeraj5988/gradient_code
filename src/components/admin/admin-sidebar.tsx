"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Award, BookOpen, Briefcase, ClipboardList, CloudDownload, CreditCard, FileText, GraduationCap, HelpCircle, History, LayoutDashboard, Scale, Settings, Share2, Star, Tags, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof BookOpen; later?: boolean };
const GROUPS: { title?: string; items: Item[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }] },
  { title: "Content", items: [
    { href: "/admin/courses", label: "Courses", icon: BookOpen },
    { href: "/admin/import", label: "Import from Drive", icon: CloudDownload },
    { href: "/admin/topics", label: "Topics", icon: Tags },
    { href: "/admin/questions", label: "Questions", icon: HelpCircle },
    { href: "/admin/resources", label: "Resources", icon: FileText },
    { href: "#", label: "Programs", icon: GraduationCap, later: true },
    { href: "#", label: "Quizzes", icon: ClipboardList, later: true },
    { href: "#", label: "Projects", icon: ClipboardList, later: true },
  ] },
  { title: "Users", items: [
    { href: "/admin/students", label: "Students", icon: Users },
    { href: "/admin/instructors", label: "Instructors", icon: UserRound },
    { href: "/admin/enrollments", label: "Enrollments", icon: GraduationCap },
  ] },
  { title: "Commerce", items: [
    { href: "/admin/orders", label: "Orders", icon: CreditCard },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/referrals", label: "Referrals", icon: Share2 },
    { href: "#", label: "Coupons", icon: Tags, later: true },
  ] },
  { title: "Career & credentials", items: [
    { href: "/admin/certificates", label: "Certificates", icon: Award },
    { href: "/admin/internships", label: "Internships", icon: Briefcase },
  ] },
  { title: "Engagement", items: [{ href: "/admin/reviews", label: "Reviews", icon: Star }] },
  { title: "System", items: [
    { href: "/admin/audit", label: "Audit log", icon: History },
    { href: "/admin/legal", label: "Legal pages", icon: Scale },
    { href: "/admin/settings", label: "Settings & integrations", icon: Settings },
  ] },
];

export function AdminSidebar() {
  const path = usePathname();
  return (
    <nav aria-label="Admin" className="space-y-4 px-3 py-4">
      {GROUPS.map((g, i) => (
        <div key={i}>
          {g.title ? <p className="px-2.5 pb-1.5 text-[11px] font-semibold tracking-wider text-subtle-foreground uppercase">{g.title}</p> : null}
          <ul className="space-y-0.5">
            {g.items.map((it) => {
              if (it.later) {
                return (
                  <li key={it.label}>
                    <span aria-disabled="true" title="Planned for a later phase" className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm text-subtle-foreground/70">
                      <it.icon className="h-4 w-4" aria-hidden />
                      <span className="flex-1">{it.label}</span>
                      <span className="rounded border border-border px-1 text-[10px]">Later</span>
                    </span>
                  </li>
                );
              }
              const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
              return (
                <li key={it.label}>
                  <Link href={it.href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm", active ? "bg-primary-soft font-medium text-primary" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground")}>
                    <it.icon className="h-4 w-4" aria-hidden />{it.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
