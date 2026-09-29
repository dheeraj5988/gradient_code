# Gradient Code

Professional EdTech platform — courses, projects, certificates and internships.
Next.js 15 · Tailwind v4 · Supabase · Paypur (UPI) · Vercel.

## Run locally
```bash
npm install
cp .env.example .env.local   # optional — without it the site runs on demo data
npm run dev                  # http://localhost:3000
```

## Database
**Fresh project bootstrapped from `supabase/master_schema.sql`** (see `docs/FRESH_DATABASE_SETUP.md`): run only
`supabase/migrations/20260929180000_admin_cms.sql` once in the SQL editor.

**Older project that still has the Lovable schema:** run these files **once, in order** (skip any already applied):
1. `supabase/migrations/20260928120000_marketplace_extensions.sql`
2. `supabase/migrations/20260929090000_learning_portal_practice.sql` — security fixes + learning portal
3. `supabase/migrations/20260929120000_drive_video_metadata.sql` — Drive video columns
4. `supabase/migrations/20260929180000_admin_cms.sql` — admin CMS, course status/demo flag, audit log
5. `supabase/migrations/20260930090000_payments_referrals.sql` — payments (Paypur), orders lockdown, referrals, payouts
6. `supabase/migrations/20260930100000_legal_pages.sql` — editable legal pages + business details
7. `supabase/migrations/20260930110000_certificates.sql` — certificate policies, eligibility, issuance, verification, revocation
8. `supabase/migrations/20260930120000_internships.sql` — internship apply/withdraw, eligibility, pipeline, timeline

Then make yourself admin (see `docs/ADMIN_GUIDE.md`).

## Environment variables
| Variable | Where | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`) | public | yes |
| `NEXT_PUBLIC_SITE_URL` | public | yes (canonical URLs, auth redirects) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **server only** | for private Drive streaming & import |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | for payments (creates orders, verifies & grants access; also encrypts the gateway key/salt you save in Admin → Payments) |
| `PAYMENT_SETTINGS_KEY` | **server only** | optional — separate secret used to encrypt the saved gateway key/salt (defaults to a key derived from the service-role key) |
| `PAYPUR_KEY`, `PAYPUR_SALT` | **server only** | optional fallback if you prefer env vars over Admin → Payments |

## Deploy (Vercel)
Import the GitHub repo, add the env vars above (Production + Preview), deploy. Node 20+. `npm run build` must pass locally first.
In Supabase → Authentication → URL configuration add your Vercel URL + `/auth/callback`.

## Docs
- `docs/CLAUDE_CURRENT_STATE.md` — current state, blockers, next steps
- `docs/PAYMENTS_SETUP.md` — Paypur setup, go-live checklist
- `docs/ADMIN_GUIDE.md` · `docs/COURSE_IMPORT_GUIDE.md` · `docs/GOOGLE_DRIVE_SETUP.md`
- `docs/PRODUCT_SPEC.md` — source of truth
- `docs/AUDIT.md` — current state
- `docs/ROADMAP.md` — phases
- `AGENTS.md` — rules for AI coding agents
- `docs/RESEARCH.md` — platform research
