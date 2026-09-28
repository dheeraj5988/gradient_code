/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreditCard } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["created_at", "amount", "status"], defaultSort: "created_at", filters: ["status"] });
  let q = ctx.supabase.from("orders").select("id,user_id,amount,status,refund_status,razorpay_order_id,created_at,course:courses(title)", { count: "exact" });
  if (p.filters.status) q = q.eq("status", p.filters.status);
  const { data, count } = await q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((o: any) => o.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Orders" description="Read-only. Razorpay checkout, verification and refunds are built in the payments phase." />
      <Toolbar params={p} placeholder="(search by student coming with payments)" filters={[{ name: "status", label: "Status", options: [["created", "Created"], ["paid", "Paid"], ["failed", "Failed"], ["refunded", "Refunded"]] }]} />
      <DataTable base="/admin/orders" params={p} total={count ?? 0}
        columns={[{ key: "created_at", label: "Date", sortable: true }, { key: "who", label: "Student" }, { key: "course", label: "Course" }, { key: "amount", label: "Amount", sortable: true }, { key: "status", label: "Status", sortable: true }, { key: "rz", label: "Razorpay order" }]}
        rows={(data ?? []).map((o: any) => ({ key: o.id, cells: [
          <span key="d" className="text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleString("en-IN")}</span>,
          people.get(o.user_id)?.email ?? "—",
          o.course?.title ?? "—",
          <span key="a" className="tabular-nums">{formatPrice(Number(o.amount))}</span>,
          <span key="s" className="capitalize">{o.status}{o.refund_status ? ` (${o.refund_status})` : ""}</span>,
          <span key="r" className="font-mono text-xs">{o.razorpay_order_id ?? "—"}</span>,
        ] }))}
        empty={<EmptyState icon={CreditCard} title="No orders yet" description="Orders will appear here once payments go live." />}
      />
    </div>
  );
}
