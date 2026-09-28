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
Your existing Supabase project already has the base schema (the older files in `supabase/migrations/`).
Run only the NEW file in the Supabase SQL editor:
`supabase/migrations/20260928120000_marketplace_extensions.sql`

## Deploy
Import the GitHub repo in Vercel, add the env vars from `.env.example`, deploy.
In Supabase → Authentication → URL configuration add your Vercel URL + `/auth/callback`.

## Docs
- `docs/PRODUCT_SPEC.md` — source of truth
- `docs/AUDIT.md` — current state
- `docs/ROADMAP.md` — phases
- `AGENTS.md` — rules for AI coding agents
- `docs/RESEARCH.md` — platform research
