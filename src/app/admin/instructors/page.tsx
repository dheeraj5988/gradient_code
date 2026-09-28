import Link from "next/link";
import { UserRound } from "lucide-react";
import { AdminHeader } from "@/components/admin/table";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";

export const metadata = { title: "Instructors" };

export default async function Instructors() {
  const ctx = (await requireAdminPage())!;
  const [{ data: list }, { data: courses }] = await Promise.all([
    ctx.supabase.from("instructors").select("id,name,slug,headline").order("name"),
    ctx.supabase.from("courses").select("instructor_id").not("instructor_id", "is", null),
  ]);
  const counts = new Map<string, number>();
  (courses ?? []).forEach((c) => counts.set(c.instructor_id, (counts.get(c.instructor_id) ?? 0) + 1));
  return (
    <div className="mx-auto max-w-5xl">
      <AdminHeader title="Instructors" description="Public instructor profiles. Assign an instructor from the course settings." actions={<ButtonLink href="/admin/instructors/new" size="sm">Add instructor</ButtonLink>} />
      {list?.length ? (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {list.map((i) => (
            <li key={i.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{i.name.split(" ").map((p: string) => p[0]).slice(0, 2).join("")}</span>
              <span className="min-w-0 flex-1"><Link href={`/admin/instructors/${i.id}`} className="font-medium hover:text-primary">{i.name}</Link><span className="block truncate text-xs text-muted-foreground">{i.headline}</span></span>
              <span className="text-xs text-muted-foreground">{counts.get(i.id) ?? 0} course(s)</span>
              <Link href={`/instructors/${i.slug}`} target="_blank" className="text-xs text-primary hover:underline">Public profile</Link>
            </li>
          ))}
        </ul>
      ) : <EmptyState icon={UserRound} title="No instructors yet" action={<ButtonLink href="/admin/instructors/new" size="sm">Add instructor</ButtonLink>} />}
    </div>
  );
}
