export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";
/** True when Supabase is not configured — the app falls back to demo data. */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_ANON_KEY;
