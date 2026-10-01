import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Service-role client — bypasses RLS. SERVER ONLY, never imported by client components.
 * Used exclusively for: payment settings (encrypted secrets), creating orders,
 * and calling finalize_paid_order() after the gateway signature is verified.
 */
/** Legacy `service_role` JWT, or the newer `sb_secret_…` key that the Supabase ↔ Vercel integration sets. */
export function serviceKeyName(): "SUPABASE_SERVICE_ROLE_KEY" | "SUPABASE_SECRET_KEY" | null {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) return "SUPABASE_SERVICE_ROLE_KEY";
  if (process.env.SUPABASE_SECRET_KEY) return "SUPABASE_SECRET_KEY";
  return null;
}

export function serviceConfigured() {
  return Boolean(SUPABASE_URL && serviceKeyName());
}

export function createServiceClient() {
  const name = serviceKeyName();
  const key = name ? process.env[name] : undefined;
  if (!SUPABASE_URL || !key) throw new Error("service_role_not_configured");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
