# Rules for AI coding agents (Antigravity, Claude, Cursor…)

Read this file and `docs/ROADMAP.md` before every task.

## Stack (do not change without asking)
- Next.js 15 App Router + React 19 + TypeScript (strict)
- Tailwind CSS v4 (tokens in `src/app/globals.css` — never hardcode colours; use `bg-surface`, `text-muted-foreground`, `gradient-fill`, `gradient-text`, etc.)
- Supabase (Postgres + Auth + Storage) via `@supabase/ssr`
- Payments: Razorpay. Hosting: Vercel. Icons: lucide-react. Fonts: @fontsource-variable.
- No new UI library. Build small components in `src/components/ui/`.

## Structure
- `src/app/(site)/*` public marketing pages (header + footer layout)
- `src/app/(auth)/*` login / signup
- `src/app/dashboard/*` learner area · `src/app/learn/[slug]` player · `src/app/admin/*` admin
- `src/lib/data/queries.ts` — ALL database reads go here (server-only). Pages never call Supabase directly for reads.
- `src/lib/data/demo.ts` — demo data used when Supabase env is missing. Keep it working.
- `supabase/migrations/` — every schema change is a NEW timestamped `.sql` file. Never edit old migrations.

## Rules
1. Server Components by default. Add `"use client"` only for interactivity.
2. Mutations = Server Actions (`actions.ts` next to the page) or `route.ts` handlers.
3. Never expose `lessons.video_url` to users who are not enrolled (except `is_free_preview`).
4. Never trust prices from the client. Compute amounts on the server.
5. `SUPABASE_SERVICE_ROLE_KEY` and `RAZORPAY_KEY_SECRET` are server-only.
6. Every table has RLS enabled with explicit policies.
7. Mobile-first: test every page at 390px wide. No horizontal scroll.
8. Accessibility: labels on inputs, alt text, visible focus, 4.5:1 contrast.
9. Before finishing a task run `npm run typecheck` and `npm run build`. Both must pass.
10. Then commit and push:
    ```
    git add -A
    git commit -m "<phase>: <short description>"
    git push origin main
    ```
11. Replace `TODO(antigravity)` comments as you implement them. Don't leave dead code.
12. At the end, reply with: files changed, what to test manually, any SQL the owner must run.
