# Email OTP setup (6-digit verification & password-reset codes)

The site now verifies email addresses and resets passwords with a **6-digit code** typed into the site, not an email link. Supabase sends the emails; the code only appears if the **email templates use `{{ .Token }}`**. Without step 2 below, users receive a link (or an empty code) and cannot verify.

Do these once, in this order. All changes are in the Supabase dashboard — no code changes.

## 1. Turn on email confirmation
Supabase → **Authentication → Sign In / Providers → Email** (older UI: *Providers → Email*)
- **Enable Email provider**: ON
- **Confirm email**: **ON** (required — if it is off, signup logs the user straight in and no code is sent)
- Leave **Secure email change** as it is.
- **Minimum password length**: 8 (the site enforces 8+ with a letter and a number)
- Save.

## 2. Change the "Confirm signup" template
Supabase → **Authentication → Email Templates → Confirm signup**
- **Subject:** `Your Gradient Code verification code`
- **Message body** (switch to the HTML/source editor and replace everything):

```html
<h2>Gradient Code Verification</h2>
<p>Your verification code is:</p>
<h1 style="letter-spacing:6px;font-size:32px;">{{ .Token }}</h1>
<p>This code expires in 10 minutes. If you didn't create a Gradient Code account, you can ignore this email.</p>
```
- Do **not** include `{{ .ConfirmationURL }}`.
- Save.

## 3. Change the "Reset Password" template
Same page → **Reset Password**
- **Subject:** `Your Gradient Code password reset code`
- **Message body:**

```html
<h2>Reset your Gradient Code password</h2>
<p>Your password reset code is:</p>
<h1 style="letter-spacing:6px;font-size:32px;">{{ .Token }}</h1>
<p>This code expires in 10 minutes. If you didn't ask to reset your password, you can ignore this email — your password won't change.</p>
```
- Save.

(Optional) The **Magic Link** template is not used. If you edit it, use `{{ .Token }}` there too.

## 4. Code length and expiry
Supabase → **Authentication → Sign In / Providers → Email**
- **Email OTP Expiration**: `600` seconds (10 minutes — matches the wording above). Never above 3600.
- **Email OTP Length**: **6** (the site's boxes are fixed at 6). Newer projects may not show this option — 6 is the default.

## 5. Rate limits (protects against spam)
Supabase → **Authentication → Rate Limits**
- Keep **Minimum interval between emails** (per user) at **60 seconds** — this matches the on-site 60-second resend timer, and is enforced by Supabase even if someone bypasses the page.
- Keep the OTP verification rate limit at the default.
- Supabase's **built-in email sender has a very low hourly cap** and is for testing only. Before you launch, connect your own SMTP: `docs/EMAIL_PROVIDER_MIGRATION.md`.

## 6. URL configuration (unchanged, still needed for Google)
Supabase → **Authentication → URL Configuration**
- **Site URL:** your production URL (e.g. `https://gradientcode.in`)
- **Redirect URLs:** `https://<your-domain>/auth/callback`, `http://localhost:3000/auth/callback`
- The `/auth/callback` route now handles **Google sign-in only**.

## 7. Run the database migration
SQL editor → run `supabase/migrations/20260930130000_email_verified_gating.sql` (after the earlier ones). It makes certificate claiming require a verified email at the database level.

## 8. Existing users
Users who already confirmed by link keep their verified status (nothing to do). Google users are verified by Google. An existing user who never confirmed is sent to `/verify-email` and gets a code when they log in.

## 9. Test it (5 minutes)
1. Open `/signup` in a private window, create an account with a real inbox.
2. You land on `/verify-email` and receive an email with a 6-digit code (no link). Enter it → you reach `/dashboard`.
3. Sign out → `/forgot-password` → code → new password → log in with it.
4. Profile page shows **Verified** with today's date.

## Troubleshooting
| Symptom | Cause |
|---|---|
| Email contains a link, no code | Template still has `{{ .ConfirmationURL }}` — redo step 2/3 |
| Signup goes straight to the dashboard, no email | **Confirm email** is off — step 1 |
| "Email rate limit exceeded" | Built-in sender's hourly cap — connect SMTP |
| Code always "incorrect or expired" | Older code used — each resend invalidates the previous code; use the newest email |
| No email at all | Check spam; check Supabase → Logs → Auth for send errors |
