export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const DRIVE_ID_RE = /^[-\w]{10,100}$/;

export type ListParams = { q: string; sort: string; dir: "asc" | "desc"; page: number; pageSize: number; filters: Record<string, string> };

export function parseList(sp: Record<string, string | string[] | undefined>, opts: { sorts: string[]; defaultSort: string; defaultDir?: "asc" | "desc"; filters?: string[]; pageSize?: number }): ListParams {
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]![0] : sp[k]) as string | undefined;
  const sort = opts.sorts.includes(one("sort") ?? "") ? one("sort")! : opts.defaultSort;
  const dir = one("dir") === "asc" ? "asc" : one("dir") === "desc" ? "desc" : (opts.defaultDir ?? "desc");
  const filters: Record<string, string> = {};
  (opts.filters ?? []).forEach((f) => { const v = one(f); if (v) filters[f] = v; });
  return { q: (one("q") ?? "").trim().slice(0, 100), sort, dir, page: Math.max(1, Number(one("page")) || 1), pageSize: opts.pageSize ?? 25, filters };
}

/** Escape user text for PostgREST ilike/or filters. */
export function ilikeTerm(q: string) {
  return `%${q.replace(/[%_\\,()*]/g, " ").trim()}%`;
}

export function str(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}
export function num(form: FormData, key: string): number | null {
  const v = str(form, key);
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
export function bool(form: FormData, key: string) {
  return form.get(key) === "on" || form.get(key) === "true";
}
export function lines(form: FormData, key: string) {
  return str(form, key).split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 50);
}

/** Parse a Drive folder/file id from an ID or any drive.google.com URL. */
export function parseDriveId(input: string): string | null {
  const s = input.trim();
  const m = s.match(/\/folders\/([-\w]+)/) ?? s.match(/\/file\/d\/([-\w]+)/) ?? s.match(/[?&]id=([-\w]+)/);
  const id = m ? m[1] : s;
  return DRIVE_ID_RE.test(id) ? id : null;
}
