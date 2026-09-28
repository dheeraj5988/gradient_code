import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Award, BookOpen, Briefcase, ClipboardList, CreditCard, FolderGit2, HelpCircle, Settings, Star, Tag, UserRound, Users } from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { IS_DEMO } from "@/lib/supabase/env";
import { getUser, isAdmin } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const SECTIONS = [
  { icon: BookOpen, title: "Courses & curriculum", body: "Courses, modules, lessons, previews" },
  { icon: HelpCircle, title: "Question bank", body: "Topics, questions, quizzes" },
  { icon: FolderGit2, title: "Projects", body: "Briefs, rubrics, submission review" },
  { icon: Users, title: "Students & enrollments", body: "Learners, manual access" },
  { icon: UserRound, title: "Instructors", body: "Profiles and course assignment" },
  { icon: CreditCard, title: "Orders & payments", body: "Purchases, refunds" },
  { icon: Tag, title: "Coupons", body: "Discount codes" },
  { icon: Award, title: "Certificates", body: "Policies, issued, revoke" },
  { icon: Briefcase, title: "Internships", body: "Listings, eligibility, applicants" },
  { icon: Star, title: "Reviews", body: "Moderation" },
  { icon: ClipboardList, title: "Analytics", body: "Enrollments, completion, revenue" },
  { icon: Settings, title: "Settings", body: "Site configuration" },
];

export default async function AdminPage() {
  if (!IS_DEMO) {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) redirect("/dashboard");
  }
  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background"><div className="container-page flex h-16 items-center gap-3"><Logo /><Badge>Admin</Badge></div></header>
      <main id="main" className="container-page py-8 sm:py-10">
        <h1 className="text-2xl font-bold sm:text-3xl">Admin</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">The new admin panel is scheduled for Phase 9. Until then, manage courses, users, and enrollments via the Supabase dashboard.</p>
        {/* TODO(antigravity, Phase 9): real admin shell + DataTable pages for each section */}
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {SECTIONS.map((s) => (
            <li key={s.title} className="flex gap-3 rounded-xl border border-border bg-card p-4">
              <s.icon className="h-5 w-5 shrink-0 text-subtle-foreground" aria-hidden />
              <div>
                <p className="text-sm font-semibold">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.body}</p>
                <Badge className="mt-2">Planned</Badge>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
