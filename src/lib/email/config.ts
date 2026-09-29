/**
 * Email delivery configuration — the single place to change when moving off Supabase's built-in email.
 *
 * TODAY: Supabase Auth sends every auth email (signup code, password-reset code) itself. This app sends no
 * email of its own, so nothing here is required. See docs/EMAIL_PROVIDER_MIGRATION.md for the move to a
 * custom SMTP provider / domain (Gmail Workspace, Resend, Brevo, …). That move is configuration in the
 * Supabase dashboard, not code — the OTP screens keep working unchanged.
 */
export type EmailProviderName = "supabase" | "smtp";

/** "supabase" = built-in sender (development only). "smtp" = Supabase configured with your own SMTP (recommended for launch). */
export const EMAIL_PROVIDER: EmailProviderName = process.env.EMAIL_PROVIDER === "smtp" ? "smtp" : "supabase";

/** Sender identities planned for the custom domain. Informational until a provider is connected. */
export const EMAIL_SENDERS = {
  noreply: process.env.EMAIL_FROM_NOREPLY || null,   // verification codes, password resets
  support: process.env.EMAIL_FROM_SUPPORT || null,   // replies from the team
  payments: process.env.EMAIL_FROM_PAYMENTS || null, // receipts / refund notices (future)
};

export function emailDeliveryStatus() {
  const custom = EMAIL_PROVIDER === "smtp";
  return {
    ok: custom,
    detail: custom
      ? `Custom SMTP declared${EMAIL_SENDERS.noreply ? ` (sender ${EMAIL_SENDERS.noreply})` : ""}. Confirm it is set under Supabase → Authentication → SMTP Settings.`
      : "Supabase's built-in email is in use. It is heavily rate-limited and meant for testing — connect your own SMTP before launch (docs/EMAIL_PROVIDER_MIGRATION.md).",
  };
}
