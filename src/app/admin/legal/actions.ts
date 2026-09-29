"use server";
import { revalidatePath } from "next/cache";
import { requireAdminAction, type ActionResult } from "@/lib/admin/guard";
import { audit } from "@/lib/admin/audit";
import { bool, num, str } from "@/lib/admin/util";

const refresh = () => { ["/terms", "/privacy", "/refund", "/contact", "/admin/legal"].forEach((p) => revalidatePath(p)); };

export async function saveSiteSettings(_prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  const email = str(form, "support_email");
  const days = num(form, "refund_window_days");
  const errs: Record<string, string> = {};
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.support_email = "Enter a valid email.";
  if (days !== null && (Number.isNaN(days) || !Number.isInteger(days) || days < 0 || days > 365)) errs.refund_window_days = "Whole days, 0–365.";
  if (Object.keys(errs).length) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: errs };
  const row = {
    id: true,
    company_name: str(form, "company_name").slice(0, 100) || null,
    legal_name: str(form, "legal_name").slice(0, 150) || null,
    support_email: email || null,
    support_phone: str(form, "support_phone").slice(0, 30) || null,
    address: str(form, "address").slice(0, 400) || null,
    refund_window_days: days,
    governing_law: str(form, "governing_law").slice(0, 200) || null,
    updated_by: g.ctx.userId,
    updated_at: new Date().toISOString(),
  };
  const { error } = await g.ctx.supabase.from("site_settings").upsert(row);
  if (error) return { ok: false, error: "Couldn't save. Has the legal-pages migration been run?" };
  await audit(g.ctx, "site.settings", "site_settings", null, "Updated business details", { ...row, updated_by: undefined });
  refresh();
  return { ok: true, data: null, message: "Business details saved." };
}

export async function saveSitePage(slug: string, _prev: unknown, form: FormData): Promise<ActionResult> {
  const g = await requireAdminAction();
  if ("denied" in g) return g.denied;
  if (!["terms", "privacy", "refund"].includes(slug)) return { ok: false, error: "Unknown page." };
  const title = str(form, "title");
  const body = String(form.get("body_md") ?? "").replace(/\r/g, "").trim();
  if (title.length < 2 || title.length > 120) return { ok: false, error: "Enter a title.", fieldErrors: { title: "2–120 characters." } };
  if (body.length < 50) return { ok: false, error: "The page body is too short.", fieldErrors: { body_md: "Add the page text." } };
  if (body.length > 60000) return { ok: false, error: "The page body is too long.", fieldErrors: { body_md: "Max 60,000 characters." } };
  const reviewed = bool(form, "reviewed");
  const { error } = await g.ctx.supabase.from("site_pages").update({ title, body_md: body, reviewed, updated_by: g.ctx.userId, updated_at: new Date().toISOString() }).eq("slug", slug);
  if (error) return { ok: false, error: "Couldn't save the page." };
  await audit(g.ctx, "site.page", "site_page", slug, `Edited “${title}” (${reviewed ? "marked reviewed" : "draft"})`, { reviewed, length: body.length });
  refresh();
  return { ok: true, data: null, message: reviewed ? "Saved and published as final." : "Saved (still shows the “being finalised” notice)." };
}
