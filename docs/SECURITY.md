# Security model (Phase 2)

All access rules live in the **database** (RLS + `SECURITY DEFINER` functions). The Next.js app only shapes data; hiding something in React is never the protection.
Migration: `supabase/migrations/20260929090000_learning_portal_practice.sql`.

## Holes found in the audit and how they were closed
| # | Problem (before) | Fix |
|---|---|---|
| 1 | `anon` and every logged-in user could `SELECT` **all lesson columns** (incl. `video_url`, `content_text`, `join_url`) for published courses | Row access to `lessons` now requires admin/staff, an active enrollment, or `is_free_preview`. `anon` has no table access. Public outline comes from `course_outline()` (safe columns only); media from `lesson_content()` which re-checks access |
| 2 | Policy `"self enroll"` let any user insert an enrollment for **any course, including paid** | Dropped. Direct inserts are admin-only. Free courses use `enroll_free()` (checks `price = 0` and published). Paid enrollment will be inserted server-side with the service role after Razorpay verification (Phase 7). `source` constrained to `free/payment/admin/manual_grant/scholarship/promotion` |
| 3 | Policy `"issue own certificate"` let students **insert their own certificate** | Dropped. Only admins (or the service role) can insert; no update policy exists |
| 4 | `quiz_questions.correct_index` (added in Phase 0) was readable by all users | Table dropped. New `practice_answer_keys` has no student access; answers are returned only by `submit_practice_answer()` after grading, or `practice_review()` if the learner has already attempted |
| 5 | Students could insert `lesson_progress` for lessons of courses they don't own | Insert now requires course access |

## Access matrix
| Data | Visitor | Logged-in, not enrolled | Enrolled learner | Admin |
|---|---|---|---|---|
| Course, modules, lesson outline | ✅ | ✅ | ✅ | ✅ |
| Lesson media / text (paid lesson) | ❌ | ❌ | ✅ | ✅ |
| Lesson media (free preview) | ✅ via RPC | ✅ | ✅ | ✅ |
| Practice questions, topics, resources | ❌ | ❌ | ✅ (published) | ✅ |
| Answer keys | ❌ | ❌ | only after own attempt, via RPC | ✅ |
| Attempts, saved, notes, video progress, plans, reviews | ❌ | own only | own only | attempts readable |
| Insert attempts | ❌ | ❌ | only via `submit_practice_answer()` | — |
| Enrollment insert | ❌ | free courses via RPC | — | ✅ |
| Certificate insert | ❌ | ❌ | ❌ | ✅ |

## Verified
The full migration chain was applied to a local PostgreSQL 16 with Supabase-style roles, and these attacks were run and **denied**: anon reading `lessons`; unenrolled user reading paid lesson content; self-enrolling in a paid course (direct insert and via `enroll_free`); self-issuing a certificate; reading another user's notes; reading/answering questions of a course not enrolled in; marking a paid lesson complete; reading answer keys directly or before attempting; forging a correct attempt; writing a note as another user; granting self admin. Allowed paths (free enrollment, preview content, own progress, grading) succeeded.

## Admin authorization
`/admin` checks `has_role(uid,'admin')` on the server; every admin-writable table enforces the same check in RLS. No client-side role checks are trusted.

## Known limits
- Old Lovable app: logged-out visitors can no longer read lessons directly; any old page that listed curriculum with the anon key will show it empty. Enrolled students and admins are unaffected.
- `orders` insert by the owner is still allowed (it grants nothing). It will be locked to the server in Phase 7.
- Drive-hosted video URLs are still shareable once an enrolled learner has them — use a streaming host with signed URLs for stronger protection.

## Phase 3 additions (admin CMS)
- **Admin authorization, two layers:** every `/admin` page calls `requireAdminPage()` (server-side `has_role` check → redirect) and every admin server action calls `requireAdminAction()`; all admin-writable tables also enforce `has_role(auth.uid(),'admin')` in RLS. No client-side role checks are trusted.
- **Unpublished lessons** are hidden from learners in `course_outline()`, `lesson_content()` and the `lessons` RLS policy (staff still see them).
- **Demo-mode open proxy fixed:** the Drive prototype `/api/video/[id]` streamed *any* Drive file ID without authentication when Supabase env vars were missing. It now refuses in demo mode, validates the lesson UUID, and only streams the Drive file linked to a lesson the database authorises. The client never supplies a Drive ID.
- **Private resources:** `/api/resource/[id]` streams Drive-backed resources only if RLS returns the row (published + enrolled, or admin).
- **Answer keys** are written only by admins (`practice_answer_keys` RLS); the admin UI never sends them to learners.
- **Review moderation:** only admins can hide/restore; hidden reviews are excluded from ratings and public reads.
- **Enrollment grants** record `granted_by` + `notes` and are written to the append-only `admin_audit_log` (no update/delete policies).
- **Dependencies:** Next.js 15.5.26; `postcss` and `sharp` pinned to patched versions via `overrides`; `npm audit` reports 0 vulnerabilities.

### Phase 3 attack tests (student JWT against the REST API) — all denied
create/edit/publish course · create module · edit lesson video · create question · read/write answer keys · `practice_review` before attempting · issue certificate · self-enroll in paid course (direct + RPC) · extend own enrollment · read another learner's notes/attempts · forge an attempt · read paid lesson (not enrolled) · anon read lessons · read/write audit log · moderate reviews · grant self admin · change application status · create resource · see unpublished lessons in outline. Admin writes and legitimate learner reads succeed (31/31).
