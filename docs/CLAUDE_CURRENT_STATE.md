# Current state — Gradient Code (after Phase 3, 2026-09-29)

Audited from `main` at `d91fdf9` and rebased onto `f6fd3af` (Antigravity: fresh-database bootstrap `supabase/master_schema.sql`, manifest, OG image, publishable-key support), then updated with Phase 3. Facts only; anything not built is listed as missing.

## 1. Architecture
Next.js **15.5.26** App Router · React 19 · TypeScript strict · Tailwind v4 (light tokens in `src/app/globals.css`) · Supabase via `@supabase/ssr` (anon key + user session only; service-role key is used only in `src/lib/supabase/service.ts` (payments)) · Vercel. Server Components by default; mutations are Server Actions; reads go through `src/lib/data/*` (learner) and `src/lib/admin/*` (admin). Demo mode (sample data, yellow banner) when Supabase env vars are missing.

## 2. Routes
- **Public:** `/`, `/courses`, `/courses/[slug]`, `/instructors/[slug]`, `/internships`, `/internships/[slug]`, `/pricing`, `/about`, `/verify` (form only), placeholders `/programs /projects /resources /careers /contact /terms /privacy /refund`.
- **Auth:** `/login`, `/signup`, `/forgot-password`, `/reset-password` (standard Supabase recovery link), `/auth/callback`, `/auth/signout`.
- **Learner:** `/dashboard` (+ `/courses /certificates /applications /profile`), `/learn/[slug]` (overview, `lesson/[id]`, `practice`, `practice/[id]`, `practice/saved`, `resources`, `notes`, `interview`, `projects`, `certificate`, `internship`).
- **Admin (Phase 3):** `/admin`, `/admin/courses` (+`new`, `[id]/edit`, `[id]/curriculum`, `[id]/lessons/[lessonId]`), `/admin/import`, `/admin/topics`, `/admin/questions`, `/admin/resources`, `/admin/students` (+`[id]`), `/admin/enrollments`, `/admin/instructors`, `/admin/reviews`, `/admin/orders`, `/admin/certificates`, `/admin/audit`, `/admin/settings`.
- **API:** `/api/video/[lessonId]` (authorised Drive stream), `/api/resource/[resourceId]` (authorised Drive file), `/api/paypur/callback` (verified payment return), `/r/[code]` (referral link).

## 3. Major components
`components/ui/*` (Button, Badge, inputs, Skeleton, EmptyState, ErrorState, ProgressBar/Ring, Breadcrumbs, Tabs, Accordion), course/learn/practice components, admin kit (`components/admin/*`: sidebar, DataTable + Toolbar, AdminForm with validation/unsaved-changes guard, ActionButton, course/lesson/question/resource/topic/instructor/enrollment forms, ImportWizard).

## 4. Supabase tables
Lovable era: profiles, user_roles, employee_permissions, courses, course_modules, lessons, enrollments, lesson_progress, certificates, forum_*, assignments, assignment_submissions, ebooks, bootcamps, messages, orders, job_openings, contact_submissions, activity_log, lesson_notes.
Added: instructors, course_reviews, wishlist, coupons, internships, internship_applications (marketplace) · video_progress, course_topics, practice_questions, practice_answer_keys, question_attempts, saved_questions, question_reviews, course_resources, learner_notes, learning_plans (Phase 2) · lesson Drive columns (Antigravity) · **admin_audit_log**, view **admin_course_stats**, course `status/is_demo/drive_folder_id`, lesson `slug/description/is_required/is_published/drive_name`, module/resource Drive IDs, review moderation, enrollment `granted_by/notes` (Phase 3).

## 5. Migrations (apply in order; older ones already exist in production)
13 Lovable files → `20260928120000_marketplace_extensions` → `20260929090000_learning_portal_practice` → `20260929120000_drive_video_metadata` → **`20260929180000_admin_cms`**. All 17 verified to apply cleanly on PostgreSQL 16.
Fresh projects use `supabase/master_schema.sql` (all of the above up to Drive metadata, 37 tables) **plus `20260929180000_admin_cms.sql`** — verified to apply cleanly (38 tables); the master schema contains none of the Phase-2-fixed holes. The fresh seed has 7 courses and **no** `data-science-python-with-ai` course.

## 6. RLS / security
All access decisions are in the database (RLS + SECURITY DEFINER RPCs `can_access_course`, `course_outline`, `lesson_content`, `enroll_free`, `submit_practice_answer`, `practice_review`). Admin writes require `has_role(uid,'admin')` in RLS **and** a server-side check in every admin page/action. Details and test matrix: `docs/SECURITY.md`.

## 7. Authentication
Supabase email/password + Google OAuth (browser client), cookie session refreshed in `middleware.ts`; `/dashboard`, `/admin`, `/checkout` require login; `/learn` is public so free previews work (content gated by DB). Password reset not built.

## 8. Course system
Courses have `status` (draft/published/archived, synced to legacy `is_published` by trigger) and `is_demo`. Demo courses are hidden from the public catalog. The 5 Lovable placeholder courses (no real video) were auto-flagged `is_demo`. Real courses: `full-stack-web-development-with-ai-ml` (21 modules, 224 Drive videos + 76 file "lessons"), `generative-ai-llms-agents-mcp` (8 modules, 46 lessons), `data-science-python-with-ai` (21 modules, 31 Drive videos).

## 9. Learning portal
DB-driven sidebar, lesson player (Drive via `/api/video` when configured, else Drive preview iframe; YouTube/Vimeo/file), completion, video resume (native + YouTube), notes, resources, rules-based plan, mobile drawer + action bar.

## 10. Practice
Topics, 8 question types, hidden answer keys, server-side grading RPC, attempts, saved, difficulty/topic progress, day/topic/module grouping, interview prep review states. Coding questions are stored, not executed.

## 11. Google Drive
Service-account JWT auth (`lib/google-drive/client.ts`), folder listing, Range-forwarding stream proxy, authorised `/api/video` + `/api/resource`, importer (scan → classify → preview → draft import, idempotent by Drive IDs). **Credentials are not configured in this environment; Google's API was unreachable from the build sandbox — real-Drive tests are BLOCKED.** Verified against a local mock of the Drive v3 API.

## 12. Admin
Implemented: dashboard (real counts), course CRUD + publish validation + duplicate + archive + demo flag, curriculum builder (modules/lessons, move up/down, publish/preview toggles, safe delete), lesson editor (Drive/YouTube/Vimeo/file), Drive importer, topics, question bank (answer keys, duplicate, publish/archive), resources (URL / private Drive / Storage), students (+detail with progress), enrollments (manual grants with reason + revoke), instructors, review moderation, read-only orders & certificates, audit log, integration status. Not built: programs, quizzes, projects, payments, coupons, internships admin, notifications, analytics.

## 13–16. Certificates / internships / referrals / payments
Certificates: see section 23. Internships: see section 24. Referrals + Payments: see the Payments & referrals section below.

## 17. TODOs
`grep -rn "TODO(antigravity" src` — player notes/resources polish, internships filters/apply, certificate list/verify, profile editor, coupon validation, Razorpay, legal page copy.

## 18. Technical debt
- 76 code/asset files in the Full Stack course were imported by Lovable as **text lessons** (they inflate lesson counts). Convert them to `course_resources` from the admin (planned tool) — nothing was changed automatically.
- Legacy `lesson_notes` kept for the old app; new notes use `learner_notes`.
- Dashboard revenue sums up to 10k paid orders in app code (replace with a SQL aggregate view when payments launch).
- Drive iframe fallback exposes Drive file IDs to enrolled learners until credentials are configured.
- `docs/COURSE_CONTENT_MANIFEST.md` names a service account email; it was not verified to exist.

## 19. Production blockers
1. Run migration `20260929180000_admin_cms.sql` on the Supabase project (on top of `master_schema.sql` for the new project).
2. Create/confirm an admin user (`user_roles.role = 'admin'`).
3. Configure Google service-account credentials and share course folders with it (otherwise Drive videos use the preview iframe).
4. Legal pages: draft templates are seeded and editable in Admin → Legal pages. **Owner must fill business details and have the text reviewed** (public pages show a “being finalised” notice until marked reviewed).
5. Payments: run migration `20260930090000_payments_referrals.sql`, set `SUPABASE_SERVICE_ROLE_KEY` in Vercel, add the Paypur key/salt in Admin → Payments, then do one real ₹1 test purchase (see `docs/PAYMENTS_SETUP.md`).

## 20. Recommended next order
Certificate eligibility + issuance → internship applications + admin pipeline → legal pages → assessments/quizzes → analytics/SEO polish.

## 21. Payments & referrals (added 2026-09-30)
- **Gateway:** Paypur (UPI). Checkout → `startPayment` (server action; price from DB, order created with service role) → Paypur `pay_url` → redirect to `/api/paypur/callback` → HMAC verified (timing-safe) → Paypur status API re-check → `finalize_paid_order()` (idempotent, amount-checked) → enrollment (`source='payment'`).
- **Admin → Payments:** key/salt (write-only, AES-256-GCM at rest), enable switch, **test mode** (charges a fixed ₹1 for every paid course; real prices untouched), referral settings, connection check. **Admin → Orders:** filters, gateway ref, TEST badge, refund bookkeeping (removes access, cancels unpaid commission).
- **Security:** students can no longer insert/update orders (old "orders insert" policy removed); `finalize_paid_order`/`fail_order` are service-role only; `payment_settings` has no client access.
- **Referrals:** `/dashboard/referrals` (code, link `/r/CODE`, balances, payout request), `/admin/referrals` (custom codes, payouts). Commission only from verified payments, 14-day hold (configurable), append-only ledger, self-referral blocked.
- **Unverified against the live gateway:** exact success/failure status strings and the status-API response shape (parser is tolerant; the signed callback is the fallback); Key → `X-PAYPUR-KEY`, Salt → signing secret mapping. Tested against a mock built from the supplied docs only.

## 22. Legal pages (added 2026-09-30)
`site_settings` (business details) + `site_pages` (terms/privacy/refund, Markdown subset, `reviewed` flag) — public read, admin write (RLS). Public routes `/terms /privacy /refund` render them (safe renderer, no raw HTML); `/contact` shows the support details once set. Unset placeholders render as “[to be confirmed]” — nothing is invented. Text is a generic draft, **not legal advice**.

## 23. Certificates (added 2026-09-30)
- `certificate_policies` per course (off by default; % of required published lessons, % of published practice questions answered correctly, credential code). `certificate_eligibility()` recomputes from DB facts on every call; `issue_certificate()` is the only way a learner gets one (students still cannot insert). Credential IDs `GC-YYYY-CODE-XXXXXXXX` (unambiguous alphabet).
- Public `/verify` → `/verify/[id]` uses `verify_certificate()` (returns name, course, date, validity only). Printable `/certificate/[id]` (browser print → PDF, A4 landscape; no server PDF library).
- Admin: `/admin/certificates` (search, revoke with reason, reinstate) and `/admin/certificates/policies`. A refunded order revokes the learner's certificate for that course.
- Not built: quizzes/assessments/projects as requirements (only lessons + practice today), QR codes, emailing certificates.

## 24. Internships (added 2026-09-30)
- Learners apply only through `apply_internship()` (direct inserts/updates on `internship_applications` are revoked). Eligibility is in the database: published, before `apply_by`, and — when a required course is set — a **valid (non-revoked) certificate** for it. Resume is a required **https link** (no file upload/storage yet); portfolio and cover note optional.
- Timeline in `internship_application_events` (visible notes for the applicant; `internal` notes admin-only via RLS). Applicants can withdraw while applied/shortlisted/interview.
- Admin: `/admin/internships` (CRUD, publish), `/admin/internships/applications` (pipeline: applied → shortlisted → interview → offered/rejected, with notes). Learner: `/dashboard/applications` (apply + tracker), internship detail shows the right state, `/learn/[slug]/internship` shows real eligibility.
- Not built: email/in-app notifications, resume file upload, screening questions, interview scheduling.
