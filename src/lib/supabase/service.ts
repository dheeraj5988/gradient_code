import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Service-role client — bypasses RLS. SERVER ONLY, never imported by client components.
 * Used exclusively for: payment settings (encrypted secrets), creating orders,
 * and calling finalize_paid_order() after the gateway signature is verified.
 */
export function serviceConfigured() {
  return Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createServiceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("service_role_not_configured");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
