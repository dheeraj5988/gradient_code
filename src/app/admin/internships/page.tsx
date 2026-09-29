/* eslint-disable @typescript-eslint/no-explicit-any */
import Link from "next/link";
import { Briefcase } from "lucide-react";
import { AdminHeader } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "Internships" };
export const dynamic = "force-dynamic";

export default async function Internships() {
  const ctx = (await requireAdminPage())!;
  const [{ data: list }, { data: apps }] = await Promise.all([
    ctx.supabase.from("internships").select("id,title,slug,company,is_published,apply_by,openings").order("created_at", { ascending: false }),
    ctx.supabase.from("internship_applications").select("internship_id,status"),
  ]);
  const count = new Map<string, number>();
  (apps ?? []).forEach((a: any) => count.set(a.internship_id, (count.get(a.internship_id) ?? 0) + 1));
  return (
    <div className="mx-auto max-w-5xl">
      <AdminHeader title="Internships" description="Listings and their applicants." actions={<><ButtonLink href="/admin/internships/applications" variant="outline" size="sm">Applications</ButtonLink><ButtonLink href="/admin/internships/new" size="sm">New internship</ButtonLink></>} />
      {list?.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {list.map((i: any) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="min-w-0 flex-1"><Link href={`/admin/internships/${i.id}`} className="font-medium hover:text-primary">{i.title}</Link><span className="block truncate text-xs text-muted-foreground">{i.company}{i.apply_by ? ` · apply by ${i.apply_by}` : ""}</span></span>
              <span className="text-xs text-muted-foreground">{count.get(i.id) ?? 0} application(s)</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${i.is_published ? "bg-success-soft text-success" : "bg-surface-2 text-muted-foreground"}`}>{i.is_published ? "Published" : "Draft"}</span>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={Briefcase} title="No internships yet" action={<ButtonLink href="/admin/internships/new" size="sm">New internship</ButtonLink>} />}
    </div>
  );
}
