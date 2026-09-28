import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from "lucide-react";
import type { ListParams } from "@/lib/admin/util";
import { cn } from "@/lib/utils";

export function qs(base: string, p: ListParams, patch: Record<string, string | number | undefined>) {
  const u = new URLSearchParams();
  const all: Record<string, string | number | undefined> = { q: p.q, sort: p.sort, dir: p.dir, page: p.page > 1 ? p.page : undefined, ...p.filters, ...patch };
  Object.entries(all).forEach(([k, v]) => v !== undefined && v !== "" && u.set(k, String(v)));
  const s = u.toString();
  return s ? `${base}?${s}` : base;
}

export type Column = { key: string; label: string; sortable?: boolean; className?: string };

export function DataTable({ base, params, columns, rows, total, empty }: { base: string; params: ListParams; columns: Column[]; rows: { key: string; cells: ReactNode[] }[]; total: number; empty: ReactNode }) {
  const pages = Math.max(1, Math.ceil(total / params.pageSize));
  const from = total ? (params.page - 1) * params.pageSize + 1 : 0;
  const to = Math.min(total, params.page * params.pageSize);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-surface text-xs text-muted-foreground">
            <tr>
              {columns.map((c) => {
                const active = params.sort === c.key;
                return (
                  <th key={c.key} scope="col" className={cn("px-4 py-2.5 font-medium whitespace-nowrap", c.className)} aria-sort={active ? (params.dir === "asc" ? "ascending" : "descending") : undefined}>
                    {c.sortable ? (
                      <Link href={qs(base, params, { sort: c.key, dir: active && params.dir === "desc" ? "asc" : "desc", page: undefined })} className="inline-flex items-center gap-1 hover:text-foreground">
                        {c.label}
                        {active ? (params.dir === "asc" ? <ArrowUp className="h-3 w-3" aria-hidden /> : <ArrowDown className="h-3 w-3" aria-hidden />) : null}
                      </Link>
                    ) : c.label}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-surface/60">
                {r.cells.map((cell, i) => <td key={i} className={cn("px-4 py-3 align-middle", columns[i]?.className)}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length ? <div className="p-8">{empty}</div> : null}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-2.5 text-xs text-muted-foreground">
        <span>{total ? `${from}–${to} of ${total}` : "0 results"}</span>
        {pages > 1 ? (
          <span className="flex items-center gap-1">
            {params.page > 1 ? <Link href={qs(base, params, { page: params.page - 1 })} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-surface" aria-label="Previous page"><ChevronLeft className="h-3.5 w-3.5" /></Link> : null}
            <span className="px-2">Page {params.page} of {pages}</span>
            {params.page < pages ? <Link href={qs(base, params, { page: params.page + 1 })} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-surface" aria-label="Next page"><ChevronRight className="h-3.5 w-3.5" /></Link> : null}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** GET-form toolbar: search + select filters. Works without JS. */
export function Toolbar({ params, placeholder, filters = [], children }: { params: ListParams; placeholder: string; filters?: { name: string; label: string; options: [string, string][] }[]; children?: ReactNode }) {
  return (
    <form role="search" className="mb-4 flex flex-wrap items-end gap-2">
      <div className="relative min-w-52 flex-1">
        <label htmlFor="adm-q" className="sr-only">Search</label>
        <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
        <input id="adm-q" name="q" defaultValue={params.q} placeholder={placeholder} className="h-9 w-full rounded-lg border border-input bg-background pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      {filters.map((f) => (
        <label key={f.name} className="text-xs text-muted-foreground">
          <span className="sr-only">{f.label}</span>
          <select name={f.name} defaultValue={params.filters[f.name] ?? ""} aria-label={f.label} className="h-9 rounded-lg border border-input bg-background px-2.5 text-sm text-foreground focus:border-primary focus:outline-none">
            <option value="">{f.label}: all</option>
            {f.options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      ))}
      <input type="hidden" name="sort" value={params.sort} />
      <input type="hidden" name="dir" value={params.dir} />
      <button className="h-9 rounded-lg border border-border-strong bg-background px-3 text-sm font-medium hover:bg-surface">Apply</button>
      {children}
    </form>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone: Record<string, string> = {
    published: "bg-success-soft text-success border-success/20",
    draft: "bg-surface-2 text-muted-foreground border-border",
    archived: "bg-warning-soft text-warning border-warning/25",
    hidden: "bg-danger-soft text-danger border-danger/20",
    active: "bg-success-soft text-success border-success/20",
    expired: "bg-surface-2 text-muted-foreground border-border",
    demo: "bg-warning-soft text-warning border-warning/25",
  };
  return <span className={cn("inline-flex rounded-md border px-1.5 py-px text-[11px] font-semibold capitalize", tone[status] ?? tone.draft)}>{status}</span>;
}

export function AdminHeader({ title, description, actions, crumbs }: { title: string; description?: ReactNode; actions?: ReactNode; crumbs?: { label: string; href?: string }[] }) {
  return (
    <div className="mb-6">
      {crumbs ? (
        <nav aria-label="Breadcrumb" className="mb-2 text-xs text-muted-foreground">
          {crumbs.map((c, i) => (
            <span key={i}>{i ? " / " : ""}{c.href ? <Link href={c.href} className="hover:text-foreground hover:underline">{c.label}</Link> : <span className="text-foreground">{c.label}</span>}</span>
          ))}
        </nav>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
