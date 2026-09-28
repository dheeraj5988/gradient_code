# Roadmap — status of the rebuild

Legend: ✅ done in starter · ⏳ to do · 🔧 partially done

## Phase 0 — Starter (DONE, this zip) ✅
Next.js 15 + Tailwind v4 + Supabase SSR, design system ported from the old site, demo-data mode,
home, catalog with filters, course detail (Udemy layout + JSON-LD), instructor page, internships list/detail,
pricing, login/signup/Google, auth callback, middleware protection, dashboard, my courses, lesson player
with mark-complete, checkout UI, admin gate, new migration `20260928120000_marketplace_extensions.sql`.

## Phase 1 — Connect & deploy ⏳
Push to GitHub, connect Supabase, run the new migration, deploy on Vercel, set Supabase auth redirect URLs.

## Phase 2 — Content & course page completion ⏳
Fill new course columns for the 3 real courses; instructors rows; free-preview video server fetch;
instructor block + FAQ on course page; review form + rating histogram; wishlist button;
forgot/reset password; About/Contact/Terms/Privacy/Refund/Careers pages ported from old site.

## Phase 3 — Payments ⏳
Razorpay order + verify + webhook, coupon validation, free-course self-enroll, order history, invoice email.

## Phase 4 — Learning experience ⏳
Player tabs (Notes via lesson_notes, Resources, Q&A forum, Quiz), auto-complete at 90% watched where possible,
certificates auto-issue at 100%, PDF certificate, public /verify/[number], LinkedIn add-to-profile.

## Phase 5 — Admin panel ⏳
Courses CRUD + curriculum builder (modules/lessons drag order, Drive link import), students & manual enrollment,
orders & refunds, coupons, instructors, internships + applicant pipeline, review moderation, support inbox.

## Phase 6 — Internships & career tracks ⏳
Apply form with resume upload (Supabase Storage), status tracking, course-completion gate,
career-track bundles, email notifications.

## Phase 7 — Polish & launch ⏳
SEO (sitemap, robots, OG images), analytics (Vercel Analytics / GA4), accessibility audit,
Lighthouse ≥ 90, error pages, loading skeletons, custom domain.
