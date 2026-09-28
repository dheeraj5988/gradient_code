import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { IS_DEMO } from "@/lib/supabase/env";
import { getUser, isAdmin } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

const SECTIONS = ["Courses & curriculum", "Students & enrollments", "Orders & refunds", "Coupons", "Instructors", "Internships & applications", "Reviews moderation", "Forum & support"];

export default async function AdminPage() {
  if (!IS_DEMO) {
    const user = await getUser();
    if (!user || !(await isAdmin(user.id))) redirect("/dashboard");
  }
  return (
    <div className="p-8">
      <Logo />
      <h1 className="mt-8 text-3xl font-bold">Admin</h1>
      <p className="text-muted-foreground">Admin panel is being rebuilt. Until then, keep using the old Lovable admin for course uploads.</p>
      {/* TODO(antigravity): admin shell + one page per section below */}
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((s) => <li key={s} className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">{s}</li>)}
      </ul>
    </div>
  );
}
