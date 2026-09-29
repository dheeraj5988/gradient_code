import "server-only";
import crypto from "node:crypto";

/**
 * AES-256-GCM for gateway secrets stored in the database. The key is derived from
 * PAYMENT_SETTINGS_KEY (preferred) or SUPABASE_SERVICE_ROLE_KEY, so a database dump
 * alone can't reveal the gateway key/salt. If you rotate the service-role key
 * without setting PAYMENT_SETTINGS_KEY, re-enter the gateway credentials in Admin → Payments.
 */
function keyMaterial(): Buffer {
  const secret = process.env.PAYMENT_SETTINGS_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("encryption_key_missing");
  return crypto.createHash("sha256").update(`gradient-code:payment-settings:v1:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", keyMaterial(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(".");
}

export function decryptSecret(payload: string): string {
  const [v, iv, tag, ct] = payload.split(".");
  if (v !== "v1" || !iv || !tag || !ct) throw new Error("bad_secret_format");
  const d = crypto.createDecipheriv("aes-256-gcm", keyMaterial(), Buffer.from(iv, "base64"));
  d.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([d.update(Buffer.from(ct, "base64")), d.final()]).toString("utf8");
}
