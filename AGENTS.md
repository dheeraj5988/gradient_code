# Rules for AI coding agents (Antigravity, Claude, Cursor…)

Before every task read, in order:
1. `docs/PRODUCT_SPEC.md` — **source of truth**. Read the sections your task touches:
   VISUAL DESIGN · DESIGN TOKENS / SYSTEM · COURSE LEARNING PORTAL · PRACTICE SYSTEM ·
   CERTIFICATE ELIGIBILITY ENGINE · INTERNSHIP ELIGIBILITY ENGINE · ADMIN PANEL.
2. `docs/AUDIT.md` — what exists today and the agreed implementation order.
3. `docs/ROADMAP.md` — phase status.

## Stack (do not change without asking)
Next.js 15 App Router · React 19 · TypeScript strict · Tailwind CSS v4 · Supabase (`@supabase/ssr`) ·
Paypur (UPI) · Vercel · lucide-react · `@fontsource-variable/inter` + `jetbrains-mono`. No UI library — use `src/components/ui/*`.

## Design rules (summary — full rules in PRODUCT_SPEC.md → VISUAL DESIGN)
- Light-first. Colours only via tokens in `src/app/globals.css` (`bg-background`, `bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`…). Never hex values in components.
- Inter everywhere. `font-mono` only inside real code UI.
- Radius: `rounded-lg` (8px) for controls, `rounded-xl` (12px) for cards. `rounded-full` only for pills/avatars.
- Shadows: `shadow-sm` / `shadow-card` only. No glow, blobs, gradients, gradient text, floating or decorative animation.
- Reuse `src/components/ui`: Button, Badge, Input, Skeleton, EmptyState, ErrorState, ProgressBar, ProgressRing, Breadcrumbs, Tabs, Accordion.
- Every data screen has loading, empty and error states.
- **Never fabricate** numbers, ratings, testimonials, logos, salaries or outcomes. If real data is missing, hide the section.

## Code rules
1. Server Components by default; `"use client"` only for interactivity.
2. All DB reads go through `src/lib/data/queries.ts` (server-only). Mutations = Server Actions or route handlers.
3. Schema changes = NEW file in `supabase/migrations/`. Never edit old migrations. RLS on every table.
4. Never expose `lessons.video_url` to non-enrolled users (except free previews). Never trust client prices or client payment success.
5. `SUPABASE_SERVICE_ROLE_KEY`, Paypur key/salt (`PAYPUR_*`, `PAYMENT_SETTINGS_KEY`) and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are server-only.
6. Mobile-first: check 390 / 768 / 1024 / 1440 px, no horizontal scroll, visible keyboard focus.
7. `npm run typecheck` and `npm run build` must pass before committing.
8. One logical commit per phase, e.g. `phase-3-learning-portal`, then `git push origin main`.
9. Replace `TODO(antigravity)` comments as you implement them.
10. Finish with: files changed, routes changed, what to test, SQL the owner must run.
