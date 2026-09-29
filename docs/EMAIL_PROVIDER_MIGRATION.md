# Moving from Supabase's built-in email to your own domain

**Today:** Supabase Auth sends the verification and password-reset emails from its own shared sender. That sender is heavily rate-limited and uses a generic address, so it's only suitable for testing. **The app sends no email itself**, so switching providers is a *Supabase dashboard change* — the OTP screens and code don't change.

Planned sender identities (informational; see `src/lib/email/config.ts`):
| Address | Used for |
|---|---|
| `noreply@gradientcode.in` | Verification and password-reset codes |
| `support@gradientcode.in` | Replies / help (set as Reply-To) |
| `payments@gradientcode.in` | Receipts and refund notices (future — not sent today) |

## Steps that are the same for every provider
1. **Own the domain's DNS** (Cloudflare / GoDaddy / your registrar).
2. Add the provider's **SPF**, **DKIM** and (recommended) **DMARC** DNS records and wait until the provider shows the domain as *Verified*.
3. Create the SMTP credentials (host, port, username, password).
4. Supabase → **Authentication → SMTP Settings** → *Enable Custom SMTP* → fill sender email `noreply@gradientcode.in`, sender name `Gradient Code`, host, port (465 or 587), username, password → Save.
5. Send a test signup to Gmail *and* an Outlook/Yahoo address; check inbox vs spam and the raw headers show `spf=pass dkim=pass`.
6. Raise Supabase → Authentication → Rate Limits → *emails per hour* to match your provider's plan.
7. (Optional) set the env var `EMAIL_PROVIDER=smtp` and `EMAIL_FROM_NOREPLY=noreply@gradientcode.in` in Vercel — this only makes **Admin → Settings** show "custom SMTP declared"; it does not change delivery.
8. Restore the templates from `docs/EMAIL_OTP_SETUP.md` if the provider change reset them (it doesn't normally).

## Options compared
| Option | Good for | Watch out |
|---|---|---|
| **Google Workspace (Gmail SMTP relay)** | You already want real mailboxes (`support@`) | Sending limits (~2,000/day per account); use an *App password* or the SMTP relay service; not built for bulk |
| **Resend** | Best developer experience, good deliverability, generous free tier | Must verify a domain; free tier has daily caps |
| **Brevo (Sendinblue)** | Free tier with a comfortable daily limit; also does marketing email | Shared IPs on free plans — verify domain and warm up |
| **Amazon SES / Postmark** | Scale and reliability later | More setup (SES starts in sandbox until approved) |

Suggested path: **Resend or Brevo for `noreply@`** (transactional) + **Google Workspace for `support@`** (human mailbox).

## Provider-specific notes
- **Resend:** Domains → Add `gradientcode.in` → add the DNS records → API keys → create key. Supabase SMTP: host `smtp.resend.com`, port `465`, username `resend`, password = the API key.
- **Brevo:** SMTP & API → SMTP → generate key. Supabase SMTP: host `smtp-relay.brevo.com`, port `587`, username = your Brevo login, password = the SMTP key. Authenticate the domain under *Senders, Domains*.
- **Gmail / Workspace:** host `smtp.gmail.com`, port `465`/`587`, username = the full address, password = an App password (2-step verification must be on). Workspace's SMTP *relay* is better for a shared mailbox. Verify SPF includes `_spf.google.com`.
(Provider dashboards change; if a field name differs, follow the provider's "SMTP" doc — the Supabase side is always the same form.)

## Later, when the app itself needs to send email
Order confirmations, certificate emails, internship updates and referral notices would need the app to call a provider API from the server. When that time comes: add a small server-only sender behind an interface (e.g. `sendEmail({to, template, data})` in `src/lib/email/`), call it from the existing server actions (payment success in `src/lib/payments/order.ts`, certificate issue, application status change), keep templates in code, and add an unsubscribe/preferences rule for anything non-transactional. Nothing of that is built yet, by design.

## Checklist before launch
- [ ] Domain verified at the provider (SPF, DKIM, DMARC)
- [ ] Custom SMTP saved in Supabase, test email delivered to Gmail inbox (not spam)
- [ ] OTP templates from `docs/EMAIL_OTP_SETUP.md` in place
- [ ] Supabase hourly email limit raised
- [ ] `support@` mailbox is monitored
