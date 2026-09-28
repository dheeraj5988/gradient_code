# Current state — Gradient Code (after Phase 3, 2026-09-29)

Audited from `main` at `d91fdf9` (Antigravity architecture commit), then updated with Phase 3. Facts only; anything not built is listed as missing.

## 1. Architecture
Next.js **15.5.26** App Router · React 19 · TypeScript strict · Tailwind v4 (light tokens in `src/app/globals.css`) · Supabase via `@supabase/ssr` (anon key + user session only; **no service-role key is used anywhere yet**) · Vercel. Server Components by default; mutations are Server Actions; reads go through `src/lib/data/*` (learner) and `src/lib/admin/*` (admin). Demo mode (sample data, yellow banner) when Supabase env vars are missing.

## 2. Routes
- **Public:** `/`, `/courses`, `/courses/[slug]`, `/instructors/[slug]`, `/internships`, `/internships/[slug]`, `/pricing`, `/about`, `/verify` (form only), placeholders `/programs /projects /resources /careers /contact /terms /privacy /refund`.
- **Auth:** `/login`, `/signup`, `/forgot-password` (placeholder), `/auth/callback`, `/auth/signout`.
- **Learner:** `/dashboard` (+ `/courses /certificates /applications /profile`), `/learn/[slug]` (overview, `lesson/[id]`, `practice`, `practice/[id]`, `practice/saved`, `resources`, `notes`, `interview`, `projects`, `certificate`, `internship`).
- **Admin (Phase 3):** `/admin`, `/admin/courses` (+`new`, `[id]/edit`, `[id]/curriculum`, `[id]/lessons/[lessonId]`), `/admin/import`, `/admin/topics`, `/admin/questions`, `/admin/resources`, `/admin/students` (+`[id]`), `/admin/enrollments`, `/admin/instructors`, `/admin/reviews`, `/admin/orders`, `/admin/certificates`, `/admin/audit`, `/admin/settings`.
- **API:** `/api/video/[lessonId]` (authorised Drive stream), `/api/resource/[resourceId]` (authorised Drive file), `/api/razorpay/order` (501 stub).

## 3. Major components
`components/ui/*` (Button, Badge, inputs, Skeleton, EmptyState, ErrorState, ProgressBar/Ring, Breadcrumbs, Tabs, Accordion), course/learn/practice components, admin kit (`components/admin/*`: sidebar, DataTable + Toolbar, AdminForm with validation/unsaved-changes guard, ActionButton, course/lesson/question/resource/topic/instructor/enrollment forms, ImportWizard).

## 4. Supabase tables
Lovable era: profiles, user_roles, employee_permissions, courses, course_modules, lessons, enrollments, lesson_progress, certificates, forum_*, assignments, assignment_submissions, ebooks, bootcamps, messages, orders, job_openings, contact_submissions, activity_log, lesson_notes.
Added: instructors, course_reviews, wishlist, coupons, internships, internship_applications (marketplace) · video_progress, course_topics, practice_questions, practice_answer_keys, question_attempts, saved_questions, question_reviews, course_resources, learner_notes, learning_plans (Phase 2) · lesson Drive columns (Antigravity) · **admin_audit_log**, view **admin_course_stats**, course `status/is_demo/drive_folder_id`, lesson `slug/description/is_required/is_published/drive_name`, module/resource Drive IDs, review moderation, enrollment `granted_by/notes` (Phase 3).

## 5. Migrations (apply in order; older ones already exist in production)
13 Lovable files → `20260928120000_marketplace_extensions` → `20260929090000_learning_portal_practice` → `20260929120000_drive_video_metadata` → **`20260929180000_admin_cms`**. All 17 verified to apply cleanly on PostgreSQL 16.

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
Certificates: table + read-only admin list; no eligibility engine or issuance (students can't self-issue). Internships: public listing/detail, applications table; no application form or admin pipeline. Referrals: architecture doc only (`docs/REFERRAL_ARCHITECTURE.md`), no tables. Payments: `orders` table, checkout UI, free-course enrollment RPC; Razorpay not integrated.

## 17. TODOs
`grep -rn "TODO(antigravity" src` — player notes/resources polish, internships filters/apply, certificate list/verify, profile editor, password reset, coupon validation, Razorpay, legal page copy.

## 18. Technical debt
- 76 code/asset files in the Full Stack course were imported by Lovable as **text lessons** (they inflate lesson counts). Convert them to `course_resources` from the admin (planned tool) — nothing was changed automatically.
- Legacy `lesson_notes` kept for the old app; new notes use `learner_notes`.
- Dashboard revenue sums up to 10k paid orders in app code (replace with a SQL aggregate view when payments launch).
- Drive iframe fallback exposes Drive file IDs to enrolled learners until credentials are configured.
- `docs/COURSE_CONTENT_MANIFEST.md` names a service account email; it was not verified to exist.

## 19. Production blockers
1. Run migration `20260929180000_admin_cms.sql` (and the earlier Phase 2 ones if not yet applied).
2. Create/confirm an admin user (`user_roles.role = 'admin'`).
3. Configure Google service-account credentials and share course folders with it (otherwise Drive videos use the preview iframe).
4. Legal pages (terms, privacy, refund) still have no content.
5. Razorpay not implemented — paid courses can only be granted manually.

## 20. Recommended next order
Payments (Razorpay order → verify → webhook → enrollment) → assessments/quizzes → certificate eligibility + issuance → internship applications + admin pipeline → referrals → analytics/SEO polish.
