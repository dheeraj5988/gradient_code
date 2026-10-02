# Next-session checkpoint (2026-10-02)

Branch `main`, base `70e97c4`. Local commits (not pushed):

| Commit | Phase |
|---|---|
| `769f1ff` | P1 desktop hero cursor tint; primary nav = Courses / Internships / Pricing / About; footer without placeholder routes; "Find my course" CTA |
| `99f6b59` | P2 learn-sidebar lesson search; visible catalog search (keeps filters + sort) |
| `59fd38d` | P3 saved courses: `/dashboard/wishlist`, `setWishlist` action, heart on cards and course page |
| `fae29c9` | P4A resume the last-watched incomplete lesson; dashboard totals use the published outline |
| `5f6ef6b` | P4B/4C timestamp notes seek the player, `?t=` deep links, native speed select, YouTube origin hardening |
| `2a78df1` | P5 profile editor (full name, phone, bio) |

Stretch items S1–S4 and the pending-systems table in the brief are **not started**.

## Verified (production build, local preview, signed out)
- `npm run typecheck` and `npm run build` pass after P5.
- Cursor tint: active only at desktop widths, hides on pointer leave; nav/CTA hrefs as designed.
- Catalog search keeps `level`/`sort` hidden fields; Clear search drops only `q`; 0 horizontal overflow at 360 px.
- Hearts on cards are 44 px links to `/login?next=%2Fcourses%2F<slug>` when signed out.
- Lesson search (53-lesson course): filter, empty state, blank restores, status text.
- Player (temporary probe page with a synthetic MP4, since removed): paused seek to 83 s, `?t=83` on load, huge `t` clamped to duration, same-lesson `?t=` change seeks without remount, speed saved/applied, invalid stored speed ignored.
- Profile validation regexes checked in Node (Hindi/Tamil names, apostrophes, phone forms).

## NOT verified (needs a signed-in account / real devices)
- Wishlist add/remove/refetch, duplicate-click idempotency, RLS isolation, error path.
- Dashboard resume hero and cards, My courses links, learn overview "Resume".
- Notes timestamp buttons inside a real lesson; YouTube `seekTo`.
- Profile save, missing-row error, session-expired error; dashboard greeting from the saved name.
- Real iPhone/Android, 200% text zoom, Lighthouse, admin visual smoke test, Tabs focus check.
- Phase 0 schema check against production (only migrations were read).

## Schema / deploy
No migrations added. Expected live: `wishlist`, `profiles` (own-row RLS), `video_progress`, `course_outline`.
Open risk (unchanged): `profiles` UPDATE RLS has no column limits, so a user could update `is_active` or `must_change_password` directly. The new action whitelists three columns, but a column-level `REVOKE` or trigger would close it. Needs its own migration and tests.

## Next task
Sign in with a test learner and run the unverified list above. Then S2 (certificate status on the learn overview), S3 (share button), S1 (compare), in that order.
