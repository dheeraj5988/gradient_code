# Repository audit — after Phase 1 (2026-09-28)

## 1. Architecture
- Next.js 15 App Router, React 19, TypeScript strict, Tailwind v4 (tokens in `src/app/globals.css`).
- Supabase via `@supabase/ssr`: `lib/supabase/{client,server,env}.ts`; `middleware.ts` refreshes the session and guards `/dashboard`, `/learn`, `/admin`, `/checkout`.
- All reads go through `src/lib/data/queries.ts` (server-only). `demo.ts` supplies clearly-labelled sample data when Supabase env vars are missing (yellow banner).
- Mutations: server actions `learn/[slug]/actions.ts` (lesson complete) and `courses/[slug]/actions.ts` (wishlist).

## 2. Routes
| Area | Routes |
|---|---|
| Marketing | `/`, `/courses`, `/courses/[slug]`, `/instructors/[slug]`, `/internships`, `/internships/[slug]`, `/pricing`, `/about`, `/verify` |
| Placeholder ("Coming soon", noindex) | `/programs`, `/projects`, `/resources`, `/careers`, `/contact`, `/terms`, `/privacy`, `/refund` |
| Auth | `/login`, `/signup`, `/forgot-password` (placeholder), `/auth/callback`, `/auth/signout` |
| Learner | `/dashboard`, `/dashboard/courses`, `/dashboard/certificates`, `/dashboard/applications`, `/dashboard/profile`, `/learn/[slug]` |
| Commerce / admin | `/checkout/[slug]` (UI only), `/api/razorpay/order` (501 stub), `/admin` (role-gated placeholder) |

## 3. Database (Supabase)
**Existing (Lovable era):** profiles, user_roles (+ `has_role()`), employee_permissions, courses, course_modules, lessons, enrollments, lesson_progress, certificates, forum_questions, forum_answers, assignments, assignment_submissions, ebooks, bootcamps, messages, orders, job_openings, contact_submissions, activity_log, lesson_notes.
**Added in `20260928120000_marketplace_extensions.sql` (must be run once):** new course columns (subtitle, level, language, mrp, what_you_learn, requirements, target_audience, skills, includes, rating/learner counts, is_featured, has_internship, instructor_id), instructors, course_reviews (+ rating trigger), wishlist, coupons, internships, internship_applications, quiz_questions.
**Not yet present (spec):** programs, topics, questions/attempts/saved, quizzes/quiz_attempts, projects/project_submissions, resources, certificate_policies, internship_policies, notifications, payments, course_progress cache.

## 4. Major components
`ui/`: Button/ButtonLink, Badge, Input/Select/Label, Card, Skeleton (+CourseCardSkeleton), EmptyState, ErrorState, ProgressBar, ProgressRing, Breadcrumbs, Tabs (ARIA), Accordion (native details), SectionHeader.
Domain: CourseCard, CourseThumb, Curriculum, SortSelect, InternshipCard, Rating, SiteHeader/MobileNav/SiteFooter, dashboard SidebarNav, learn CourseNavDrawer, ComingSoon.

## 5. Open TODOs (`grep -rn "TODO(antigravity" src`)
Free-preview video fetch for non-enrolled users · notes/resources/Q&A tabs · review author names · certificate list + `/verify/[id]` · application form + tracker · learner profile editor · password reset · coupon validation · Razorpay order/verify/webhook · admin panel · internship filters · plans in DB · legal page text.

## 6. Product-spec gaps
Learning portal sections (practice, quizzes, projects, resources, notes, interview), practice engine, progress engine beyond lessons, assessments, certificate & internship eligibility engines, programs, projects marketplace, notifications, global grouped search, real admin, analytics.

## 7. Technical risks
- `getNextLessons` does one curriculum query per course (fine for ≤4, replace with a view later).
- Progress is computed on read from `lesson_progress`; add a `course_progress` table/view when quizzes/practice count.
- Enrolment insert RLS is admin-only today → paid/free self-enrol must use a server route with the service role after verification.
- Old Lovable admin still writes `courses`; new columns default safely, but keep both apps pointing at the same DB carefully.
- Legal pages contain no text yet — required before taking payments.

## 8. Recommended order
2 Learning portal → 3 Practice engine → 4 Projects/resources/notes/interview → 5 Assessments + certificate engine → 6 Internship engine + applications → 7 Payments → 8 Admin → 9 SEO/analytics/polish. (Payments may be pulled forward if sales must start earlier.)
