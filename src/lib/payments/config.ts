import "server-only";
import { createServiceClient, serviceConfigured } from "@/lib/supabase/service";
import { decryptSecret } from "./crypto";
import type { Creds } from "./paypur";

export type PaymentConfig = {
  serviceReady: boolean;          // SUPABASE_SERVICE_ROLE_KEY present
  enabled: boolean;
  testMode: boolean;
  testAmount: number;
  hasCredentials: boolean;
  credentialSource: "database" | "env" | "none";
  keyHint: string | null;
  creds: Creds | null;
  referral: { enabled: boolean; commissionPercent: number; clearanceDays: number; minPayout: number };
  problem: string | null;         // human-readable reason payments can't run
};

/** Reads payment_settings with the service role and decrypts the gateway credentials. Server only. */
export async function loadPaymentConfig(): Promise<PaymentConfig> {
  const base: PaymentConfig = { serviceReady: serviceConfigured(), enabled: false, testMode: true, testAmount: 1, hasCredentials: false, credentialSource: "none", keyHint: null, creds: null, referral: { enabled: true, commissionPercent: 10, clearanceDays: 14, minPayout: 500 }, problem: null };
  if (!base.serviceReady) return { ...base, problem: "No Supabase server key on the server — set SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) in Vercel and redeploy." };
  try {
    const { data, error } = await createServiceClient().from("payment_settings").select("*").eq("id", true).maybeSingle();
    if (error) return { ...base, problem: "Payment tables are missing — run the payments migration." };
    const row = data as Record<string, unknown> | null;
    if (row) {
      base.enabled = !!row.enabled;
      base.testMode = row.test_mode !== false;
      base.testAmount = Number(row.test_amount ?? 1);
      base.keyHint = (row.gateway_key_hint as string | null) ?? null;
      base.referral = { enabled: row.referral_enabled !== false, commissionPercent: Number(row.referral_commission_percent ?? 10), clearanceDays: Number(row.referral_clearance_days ?? 14), minPayout: Number(row.referral_min_payout ?? 500) };
      if (row.gateway_key_enc && row.gateway_salt_enc) {
        try {
          base.creds = { key: decryptSecret(row.gateway_key_enc as string), salt: decryptSecret(row.gateway_salt_enc as string) };
          base.credentialSource = "database";
        } catch {
          base.problem = "Saved gateway credentials can't be decrypted (the server secret changed). Re-enter them in Admin → Payments.";
        }
      }
    }
    if (!base.creds && process.env.PAYPUR_KEY && process.env.PAYPUR_SALT) {
      base.creds = { key: process.env.PAYPUR_KEY, salt: process.env.PAYPUR_SALT };
      base.credentialSource = "env";
      base.problem = null;
    }
    base.hasCredentials = !!base.creds;
    if (!base.problem && !base.hasCredentials) base.problem = "Gateway key and salt have not been added yet (Admin → Payments).";
    if (!base.problem && !base.enabled) base.problem = "Payments are switched off (Admin → Payments).";
    return base;
  } catch (e) {
    return { ...base, problem: e instanceof Error && e.message === "encryption_key_missing" ? "No encryption secret available on the server." : "Payment settings couldn't be loaded." };
  }
}

/** Charged amount for a course: test mode charges the configured test amount for any paid course. */
export function chargeAmount(cfg: Pick<PaymentConfig, "testMode" | "testAmount">, price: number) {
  if (price <= 0) return 0;
  return cfg.testMode ? cfg.testAmount : price;
}
