# Gradient Code

Professional EdTech platform — courses, projects, certificates and internships.
Next.js 15 · Tailwind v4 · Supabase · Razorpay · Vercel.

## Run locally
```bash
npm install
cp .env.example .env.local   # optional — without it the site runs on demo data
npm run dev                  # http://localhost:3000
```

## Database
Your Supabase project already has the Lovable base schema. Run these files **once, in order**, in the Supabase SQL editor (skip any already applied):
1. `supabase/migrations/20260928120000_marketplace_extensions.sql`
2. `supabase/migrations/20260929090000_learning_portal_practice.sql` — security fixes + learning portal
3. `supabase/migrations/20260929120000_drive_video_metadata.sql` — Drive video columns
4. `supabase/migrations/20260929180000_admin_cms.sql` — admin CMS, course status/demo flag, audit log

Then make yourself admin (see `docs/ADMIN_GUIDE.md`).

## Environment variables
| Variable | Where | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | public | yes |
| `NEXT_PUBLIC_SITE_URL` | public | yes (canonical URLs, auth redirects) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | **server only** | for private Drive streaming & import |
| `SUPABASE_SERVICE_ROLE_KEY`, `RAZORPAY_*` | **server only** | later (payments) |

## Deploy (Vercel)
Import the GitHub repo, add the env vars above (Production + Preview), deploy. Node 20+. `npm run build` must pass locally first.
In Supabase → Authentication → URL configuration add your Vercel URL + `/auth/callback`.

## Docs
- `docs/CLAUDE_CURRENT_STATE.md` — current state, blockers, next steps
- `docs/ADMIN_GUIDE.md` · `docs/COURSE_IMPORT_GUIDE.md` · `docs/GOOGLE_DRIVE_SETUP.md`
- `docs/PRODUCT_SPEC.md` — source of truth
- `docs/AUDIT.md` — current state
- `docs/ROADMAP.md` — phases
- `AGENTS.md` — rules for AI coding agents
- `docs/RESEARCH.md` — platform research
