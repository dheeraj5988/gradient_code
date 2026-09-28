import type { Metadata } from "next";
import Link from "next/link";
import { Database } from "lucide-react";
import { Logo } from "@/components/brand";
import { Badge } from "@/components/ui/badge";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin | Gradient Code" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage(); // server-side: redirects non-admins
  if (!admin) {
    return (
      <main id="main" className="container-page py-16">
        <EmptyState icon={Database} title="Admin needs a configured Supabase project" description="Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, run the migrations, and sign in with an admin account. See docs/ADMIN_GUIDE.md." />
      </main>
    );
  }
  return (
    <div className="min-h-screen bg-surface lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-border bg-background lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-r lg:border-b-0">
        <div className="flex h-14 items-center justify-between gap-2 border-b border-border px-4">
          <Logo href="/admin" />
          <Badge>Admin</Badge>
        </div>
        <details className="group lg:hidden">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium">Menu</summary>
          <AdminSidebar />
        </details>
        <div className="hidden lg:block"><AdminSidebar /></div>
        <div className="hidden space-y-1 border-t border-border px-5 py-4 text-xs text-muted-foreground lg:block">
          <p className="truncate" title={admin.email}>Signed in as {admin.email}</p>
          <p className="flex gap-3"><Link href="/" className="hover:text-foreground hover:underline">View site</Link><Link href="/dashboard" className="hover:text-foreground hover:underline">My learning</Link></p>
        </div>
      </aside>
      <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
