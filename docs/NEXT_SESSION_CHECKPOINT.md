# Checkpoint: learner convenience pass (2026-10-02)

Branch `feat/learner-convenience` (draft PR into `main`). Base: `origin/main` = `70e97c4` (not behind; fetched before pushing).

| Commit | Change |
|---|---|
| `769f1ff` | Desktop-only hero cursor tint; primary nav = Courses / Internships / Pricing / About; footer without placeholder routes; "Find my course" CTA |
| `99f6b59` | Learn-sidebar lesson search; visible catalog search (keeps filters and sort) |
| `59fd38d` | Saved courses: `/dashboard/wishlist`, `setWishlist` action, heart on cards and course page |
| `fae29c9` | Resume the last-watched incomplete lesson; dashboard totals use the published outline |
| `5f6ef6b` | Timestamp notes seek the player, `?t=` deep links, native speed select, YouTube message-origin hardening |
| `2a78df1` | Profile editor (full name, phone, bio) |
| `4d2d021` and the last commit on this branch | docs only: this checkpoint and `PROFILES_COLUMN_RESTRICTION_PROPOSAL.md` |

No migrations, no admin, payment, API or middleware changes (`git diff origin/main..HEAD --name-only` shows none under `src/app/admin`, `src/lib/payments`, `src/app/api`, `supabase/`). Stretch items S1–S4 and the pending systems (projects, quizzes, Q&A, learner reviews) are **not started**.

## Commands run and results
```bash
git fetch origin && git log --oneline origin/main..HEAD   # 7 commits ahead, 0 behind
npm run typecheck            # pass (run before and after the build)
npm run build                # pass, "Compiled successfully"; /dashboard/wishlist and /dashboard/profile listed
git diff origin/main..HEAD --stat   # 33 files, +732 / -97 before the two docs
git diff origin/main..HEAD -U0 | grep -E '^\+' | grep -i -E 'zz-probe|console\.(log|debug)|debugger|SERVICE|SECRET|PAYPUR_|PRIVATE_KEY|eyJ'   # no matches
git ls-files | grep -E 'zz-probe|\.mp4$|\.env'   # only .env.example (names/placeholders; untouched by this branch)
```
`.next` and `.env.local` are git-ignored. The temporary probe route and synthetic MP4 were deleted before they were ever committed.

## Checked in a local production build, signed out
- Horizontal overflow: **0** px across 7 public routes (`/`, `/courses`, filtered `/courses`, a course page, a free-preview lesson with `?t=83`, `/pricing`, `/login`) × widths 360 / 390 / 768 / 1024 / 1440 × light and dark (70 checks, same-origin iframes at each width).
- Cursor tint: computed `display` is `none` at 360/390/768 and `block` at 1024/1440. With the pointer idle for 3 s: 0 animation-frame calls. Two quick mouse moves: 1 frame. A `touch` pointer event: 0.
- Catalog search keeps `level`/`sort` as hidden fields; Clear search drops only `q`. Signed-out hearts are 44 px links to `/login?next=%2Fcourses%2F<slug>`; `login` reads `next` through `safeNext`.
- Lesson search on a 53-lesson course: filters, empty message, blank restores all, polite status text.
- Native player on a **temporary synthetic video** (not a real course video): paused seek to 83 s without playing; `?t=83` on load; `t=99999999` clamps to the video length; a same-lesson `?t=` change seeks without remounting; speed saved and re-applied; an invalid stored speed is ignored.
- Profile validation rules, in Node only: Hindi/Tamil names, apostrophes, phone forms.

## NOT verified (nothing below was run)
Signed-in flows need two test learners (A, B), one enrolled course with a real Drive video, and one admin.

**Wishlist**: save/remove persists after reload; rapid repeated clicks leave no duplicates and the heart matches the DB; B cannot see or change A's list; login returns to the original course after signing in. *(Code paths: pending state disables the button, upsert uses `ignoreDuplicates`, RLS `own wishlist`. Not exercised.)*

**Resume**: resume an unfinished lesson after watching another; seeking never completes a lesson; unpublished lessons never become targets (`course_outline` filters `is_published`); all-complete shows "Review course"/overview. *(Defined behaviour: when every lesson is complete there is no resume lesson, the hero says "Review course" and links to the course overview.)*

**Player and notes**: real authorized course video; note timestamp on the same lesson (button) and from the course Notes page (`?t=` link); missing / negative / non-numeric / array / oversized `t` are ignored or clamped; seeking does not autoplay or mark complete; saved speed on a real native file; **YouTube** (separate review): confirm `seekTo` works, progress messages still arrive, a message from another origin or another frame is ignored (handler now requires `e.source === iframe.contentWindow` and an exact `youtube(-nocookie).com` host; commands post only to the embed's own origin); confirm no Drive file ID or media URL appears in notes links, new props, or logged output (new props are `startAt` (a number), lesson IDs and titles only).

**Profile**: save, validation errors keep typed input, reload, dashboard greeting uses the saved name, missing-row and expired-session messages; A cannot update B (RLS, action never accepts an ID).

**Visual**: real touch device (tint absent), `prefers-reduced-motion`, keyboard-only pass, 200% zoom, screenshots at all five widths for the signed-in pages, the Tabs focus ring, and an **admin page** for accidental shared-style changes (admin was not opened; `.gc-public` is not applied there by design).

**Other**: Lighthouse, real iPhone/Android, production schema (only migrations were read).

## Security follow-up (not applied)
`docs/PROFILES_COLUMN_RESTRICTION_PROPOSAL.md`: learners can update `is_active`, `must_change_password` and also `email` (used by admin lookups) on their own row. It lists every current writer of `profiles`, a narrow column-grant fix, rollback SQL and 11 staging tests. **No SQL was run.**

## Next task
Run the unverified list above on the Vercel preview, then decide on the proposal, then S2 (certificate status on the learn overview), S3 (share button), S1 (compare).
