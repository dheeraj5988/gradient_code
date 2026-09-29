/* eslint-disable @typescript-eslint/no-explicit-any */
import { CreditCard } from "lucide-react";
import { AdminHeader, DataTable, Toolbar } from "@/components/admin/table";
import { AdminForm, SubmitButton, TextInput } from "@/components/admin/form";
import { EmptyState } from "@/components/ui/empty-state";
import { requireAdminPage } from "@/lib/admin/guard";
import { profilesById } from "@/lib/admin/queries";
import { parseList } from "@/lib/admin/util";
import { formatPrice } from "@/lib/utils";
import { markOrderRefunded } from "../payments/actions";

export const metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const ctx = (await requireAdminPage())!;
  const p = parseList(await searchParams, { sorts: ["created_at", "amount", "status"], defaultSort: "created_at", filters: ["status"] });
  let q = ctx.supabase.from("orders").select("id,user_id,amount,list_amount,status,test_mode,provider_order_id,provider_txn_id,failure_reason,verified_by,paid_at,created_at,course:courses(title)", { count: "exact" });
  if (p.filters.status) q = q.eq("status", p.filters.status);
  const { data, count } = await q.order(p.sort, { ascending: p.dir === "asc" }).range((p.page - 1) * p.pageSize, p.page * p.pageSize - 1);
  const people = await profilesById(ctx, (data ?? []).map((o: any) => o.user_id));
  return (
    <div className="mx-auto max-w-6xl">
      <AdminHeader title="Orders" description="Every checkout attempt. Only orders verified with the gateway's signed confirmation become “Paid”. Refunds are paid out from the Paypur dashboard; mark them here to remove access." />
      <Toolbar params={p} placeholder="(search by student coming later)" filters={[{ name: "status", label: "Status", options: [["created", "Created"], ["pending", "Pending"], ["paid", "Paid"], ["failed", "Failed"], ["refunded", "Refunded"]] }]} />
      <DataTable base="/admin/orders" params={p} total={count ?? 0}
        columns={[{ key: "created_at", label: "Date", sortable: true }, { key: "who", label: "Student" }, { key: "course", label: "Course" }, { key: "amount", label: "Amount", sortable: true }, { key: "status", label: "Status", sortable: true }, { key: "ref", label: "Gateway ref" }, { key: "act", label: "" }]}
        rows={(data ?? []).map((o: any) => ({ key: o.id, cells: [
          <span key="d" className="text-xs whitespace-nowrap">{new Date(o.created_at).toLocaleString("en-IN")}</span>,
          people.get(o.user_id)?.email ?? "—",
          o.course?.title ?? "—",
          <span key="a" className="tabular-nums whitespace-nowrap">{formatPrice(Number(o.amount))}{o.test_mode ? <span className="ml-1.5 rounded bg-warning-soft px-1 text-[10px] font-semibold text-warning">TEST</span> : null}</span>,
          <span key="s" className="capitalize" title={o.failure_reason ?? undefined}>{o.status}{o.failure_reason && o.status !== "refunded" ? ` · ${String(o.failure_reason).slice(0, 24)}` : ""}</span>,
          <span key="r" className="font-mono text-[11px] break-all">{o.provider_txn_id ?? o.provider_order_id ?? "—"}</span>,
          o.status === "paid" ? (
            <details key="x" className="text-xs">
              <summary className="cursor-pointer text-primary">Refund…</summary>
              <div className="mt-2 w-56"><AdminForm action={markOrderRefunded}><input type="hidden" name="id" value={o.id} /><TextInput name="note" label="Paypur refund reference" required /><SubmitButton variant="outline" size="sm" pendingText="Working…">Mark refunded</SubmitButton></AdminForm></div>
            </details>
          ) : null,
        ] }))}
        empty={<EmptyState icon={CreditCard} title="No orders yet" description="Orders appear here as soon as a student starts a payment." />}
      />
    </div>
  );
}
