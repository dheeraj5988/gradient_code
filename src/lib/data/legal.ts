import "server-only";
import { createClient } from "@/lib/supabase/server";
import { IS_DEMO } from "@/lib/supabase/env";

export type SiteSettings = { company_name: string | null; legal_name: string | null; support_email: string | null; support_phone: string | null; address: string | null; refund_window_days: number | null; governing_law: string | null };
export type SitePage = { slug: string; title: string; body_md: string; reviewed: boolean; updated_at: string };

export async function getSiteSettings(): Promise<SiteSettings | null> {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("site_settings").select("company_name,legal_name,support_email,support_phone,address,refund_window_days,governing_law").eq("id", true).maybeSingle();
  return (data as SiteSettings | null) ?? null;
}

export async function getSitePage(slug: string): Promise<SitePage | null> {
  if (IS_DEMO) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("site_pages").select("slug,title,body_md,reviewed,updated_at").eq("slug", slug).maybeSingle();
  return (data as SitePage | null) ?? null;
}

/** Fills {{placeholders}} from site settings. Missing values become "[to be confirmed]" — never invented. */
export function fillPlaceholders(md: string, s: SiteSettings | null) {
  const company = s?.company_name || "Gradient Code";
  const map: Record<string, string | null | undefined> = {
    company_name: company,
    legal_name: s?.legal_name || company,
    support_email: s?.support_email,
    support_phone: s?.support_phone,
    address: s?.address,
    refund_window_days: s?.refund_window_days != null ? String(s.refund_window_days) : null,
    governing_law: s?.governing_law,
  };
  return md.replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_m, k: string) => map[k] || "[to be confirmed]");
}
