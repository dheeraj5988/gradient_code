# Gradient Code — project memory for Claude

Gradient Code is an Indian EdTech platform. It sells video courses (Hinglish, hosted privately on Google Drive), and gives learners a learning portal with progress, practice questions, notes and resources. It also runs certificates (server-side eligibility, public verification), internships (certificate-gated applications with an admin pipeline), referrals (commission ledger and payouts) and Paypur UPI payments. Admins manage everything through an in-app CMS that includes a Google Drive importer.

**Stack (do not change without asking):** Next.js 15 App Router · React 19 · TypeScript strict · Tailwind CSS v4 · Supabase (`@supabase/ssr`) · Paypur (UPI) payments · Vercel · lucide-react · `@fontsource-variable/inter` + `jetbrains-mono`. No UI library: use `src/components/ui/*`.

## Code rules
1. Server Components by default. Use `"use client"` only for interactivity.
2. All learner DB reads go through `src/lib/data/*` (entry point `src/lib/data/queries.ts`, server-only). Admin reads go through `src/lib/admin/*`. Mutations are Server Actions or route handlers.
3. Schema changes go in a **new** file in `supabase/migrations/`. Never edit an old migration. Every table gets RLS.
4. Never expose `lessons.video_url` / Drive file IDs to non-enrolled users (free previews excepted). Media goes through `lesson_content()` RPC and `/api/video/[lessonId]`.
5. Never trust a client price or a client-reported payment success. The price comes from `courses.price`. Access is granted only by `finalize_paid_order()` after the HMAC-verified callback and a server-to-server status check.
6. Server-only secrets must never be in `NEXT_PUBLIC_*` or client code: `SUPABASE_SERVICE_ROLE_KEY`, Paypur key/salt (`PAYPUR_*`, `PAYMENT_SETTINGS_KEY`), `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`. The service role is used only in `src/lib/supabase/service.ts`.
7. Admin: every page calls `requireAdminPage()`, every action calls `requireAdminAction()`, and RLS also checks `has_role(auth.uid(),'admin')`.
8. When you implement something, replace its `TODO(antigravity)` comment.

## Design rules (full rules: `docs/PRODUCT_SPEC.md` → VISUAL DESIGN)
- Light and dark themes via semantic tokens in `src/app/globals.css` only (`bg-background`, `bg-surface`, `text-muted-foreground`, `border-border`, `bg-primary`…). No hex colours in components. Exceptions: OG image, theme-color meta, print CSS.
- Inter everywhere. Use `font-mono` only for real code UI.
- `rounded-lg` for controls, `rounded-xl` for cards, `rounded-full` only for pills/avatars.
- Use `shadow-sm` / `shadow-card` only. No glow, blobs, gradient text or decorative/looping animation.
- **Public/learner pages only** (wrapped in `.gc-public`): restrained glass via the `glass` / `glass-strong` utilities on structural bars and sheets (header, drawers, buy bar), one static `hero-tint`, `shadow-elevated` for sheets, 44px touch targets and 16px inputs (applied by scoped CSS). Cards, forms, prose and video stay opaque. Admin never uses `.gc-public`.
- **Narrow exception to "no decorative animation":** the home hero may show one event-driven primary-blue cursor tint (`hero-cursor-tint.tsx`). It mounts only on `(min-width:1024px) and (hover:hover) and (pointer:fine) and (prefers-reduced-motion:no-preference)`, has no idle animation loop, and is hidden in forced-colors. Admin, auth, checkout and the learner player never get it. Do not extend it site-wide.
- Mobile overlays use `src/components/ui/mobile-sheet.tsx` (native `<dialog>`); never hand-roll a modal `<div>`.
- Reuse `src/components/ui`: Button, Badge, Input, Skeleton, EmptyState, ErrorState, ProgressBar, ProgressRing, Breadcrumbs, Tabs, Accordion.
- Every data screen has loading, empty and error states.
- Never fabricate numbers, ratings, testimonials, logos, salaries or outcomes. If real data is missing, hide the section.

## Quality gates
- Mobile-first: check 390 / 768 / 1024 / 1440 px in **light and dark**. No horizontal scroll, and keyboard focus must be visible.
- `npm run typecheck` and `npm run build` must pass before any commit.

## Git rules
- One logical commit per phase or task, with a clear message (e.g. `phase-8-admin-analytics: …`). Then `git push origin main` when asked.
- Never force-push. Never squash or rewrite unrelated history.
- Commit messages end with the Claude attribution lines the tool provides.

## Working agreement
- Before any non-trivial task, enter plan mode, summarise the plan in under 15 lines, and wait for approval.
- Make the smallest change that solves the problem. Do not rebuild or restyle working screens.
- For payments, RLS, auth, certificates or referral money logic: explain the risk first, add a migration if the schema changes, and give exact test steps.
- Finish every task with: files changed, routes changed, what to test, SQL the owner must run, and what could not be verified (e.g. it needs real Supabase/Paypur/Drive credentials). Never claim something works if you did not run it.
- Keep answers short. Do not paste large files into chat.

## Current state (2026-10-01, `main` @ fa23164)
- **Auth:** plain Supabase email/password with "Confirm email" OFF for the testing phase. The OTP flow was removed. Historical migration `20260930130000_email_verified_gating` stays and is compensated by `20260930140000_remove_email_verification_gate`. Password reset uses the standard Supabase recovery link (`/forgot-password` → `/auth/callback` → `/reset-password`).
- **Google OAuth:** via `/auth/callback` (with `safeNext` open-redirect protection). Needs the provider enabled in Supabase.
- **Payments:** Paypur UPI. `startPayment` → Paypur → `/api/paypur/callback` → HMAC + status API → `finalize_paid_order()`. Admin → Payments has a test mode that charges ₹1. Not yet verified against the live gateway.
- **Referrals:** `/r/[code]`, `/dashboard/referrals`, `/admin/referrals`. Commission only from verified payments, 14-day hold, append-only ledger, manual payouts.
- **Certificates:** `certificate_policies`, `certificate_eligibility()` / `issue_certificate()` RPCs, `/verify/[id]`, printable `/certificate/[id]`. A refund revokes the certificate.
- **Internships:** `apply_internship()` RPC (needs a valid certificate when the internship requires a course), application timeline, admin pipeline.
- **Admin CMS:** courses, curriculum, lessons, topics, question bank, resources, students, enrollments, instructors, reviews, orders, payments, legal pages, certificates, internships, audit log, settings.
- **Drive import:** Admin → Import (scan → preview → draft import, idempotent by Drive file ID). Admin → Settings has a "Test connection" button.
- **Private streaming:** `/api/video/[lessonId]` and `/api/resource/[resourceId]` use a service-account JWT, the DB checks access, and HTTP Range (200/206/416) is forwarded. Without credentials the player falls back to the Drive preview iframe.
- **Theme:** light/dark via `html.dark` tokens, a pre-paint script (saved choice → system preference → light), and a header `ThemeToggle`. Printed certificates stay light.

## Do not do
- No OTP / email-verification gating (it was removed on purpose for testing).
- No public or "anyone with the link" Drive folders or videos.
- No "Open in Drive" links or Drive URLs for paid content.
- No secrets in the repo (`.env*` is git-ignored; `.env.example` holds names only).
- No broad grants on `public.profiles` to `authenticated`: learners may UPDATE only `full_name`, `phone`, `bio` (column grants) and may not INSERT. A new learner-editable column needs its own migration with an explicit `GRANT UPDATE (col)`.
- No direct client inserts or updates on `orders`, `enrollments`, `certificates` or `internship_applications`. Those go through RPCs or the service role only.

## Pointers
Details live in `docs/`. **Read the relevant doc before touching payments, RLS, Drive, certificates or referrals:**
`docs/PRODUCT_SPEC.md` (source of truth) · `docs/CLAUDE_CURRENT_STATE.md` · `docs/SECURITY.md` · `docs/PAYMENTS_SETUP.md` · `docs/GOOGLE_DRIVE_ARCHITECTURE.md` / `GOOGLE_DRIVE_SETUP.md` · `docs/CERTIFICATE_ARCHITECTURE.md` · `docs/REFERRAL_ARCHITECTURE.md` · `docs/FRESH_DATABASE_SETUP.md` (migration order) · `docs/ADMIN_GUIDE.md`.
