# Restrict learner writes on `public.profiles` (migration `20261002120000`)

**Status (2026-10-02): migration written and rehearsed on a throwaway local Postgres. NOT applied to staging or production. Staging inspection and staging tests: NOT RUN (no staging access in this session).**

## Problem
`public.profiles` had `GRANT SELECT, INSERT, UPDATE … TO authenticated` (table-wide) and the policy `own profile write` (`id = auth.uid() OR has_role(admin)`). RLS limits which *row* a learner can change, not which *columns*. Any signed-in learner could rewrite their own `email` (admin tools look people up by it), `is_active`, `must_change_password`, `avatar_url`, `created_at` and `updated_at`, and could upsert their own row.

## Decisions applied
1. `authenticated` may UPDATE only `full_name`, `phone`, `bio`.
2. `authenticated` may no longer INSERT into `profiles` (signup always goes through the `on_auth_user_created` trigger).
3. The admin status RPC is deferred until an admin feature needs it.

SELECT permissions and all three RLS policies are unchanged. No payment, auth or admin code changed.

## The migration (`supabase/migrations/20261002120000_restrict_profiles_writes.sql`)
```sql
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, bio) ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;
-- + a DO block that raises (aborting the whole migration) if authenticated can still UPDATE a protected
--   column or INSERT, or lost SELECT. It uses has_*_privilege(), which counts grants to PUBLIC and to roles
--   authenticated inherits from, so it catches leaks that the three statements alone would not remove.
```
Apply it as a single transaction: `supabase db push`, the SQL editor, or `psql -1 -f` (`--single-transaction`). Run statement-by-statement in autocommit mode, a failed self-check would leave the REVOKE/GRANT applied.

Expected effect: Postgres drops any existing column-level grants when the table-level privilege is revoked (shown in the rehearsal: a pre-existing `GRANT UPDATE (is_active)` did not survive).

## Before applying: inspect the real database (NOT RUN)
Repository migrations do not prove the live configuration. Run `supabase/tests/profiles_grants_inspect.sql` (read-only) on staging, then production, and read the output:
- **q1–q3** table owner, ACLs, effective per-role privileges and which columns each role can UPDATE.
- **q4** roles that `authenticated` is a member of (an unexpected one can grant UPDATE/INSERT indirectly).
- **q5** default privileges (Supabase projects normally grant ALL on new public tables to `anon`/`authenticated`/`service_role`).
- **q6–q8** policies, triggers (`on_auth_user_created` must exist and be enabled), and who owns `handle_new_user` / `issue_certificate` (they must be `SECURITY DEFINER` and not owned by `authenticated`).
- **q9** auth users **without** a profile row. After this migration a learner can no longer insert their own row, so expect zero rows; backfill any with the service role first.

Repo-side findings that the inspection should confirm:
- The only definer writers are `handle_new_user()` (INSERT) and `issue_certificate()` (UPDATE `full_name`), both owned by the migration runner, so they keep their privileges.
- Nothing in `src/` inserts into `profiles`. Writers: the profile editor (`full_name, phone, bio`) and checkout (`phone`). Admin pages only read.
- `master_schema.sql` (the documented bootstrap path) defines `profiles`, grants, policies and the trigger identically to the migrations.

## Tests
`supabase/tests/profiles_column_grants.test.sql` (46 cases, one transaction, ends in `ROLLBACK`). It switches to the real `authenticated` / `anon` / `service_role` database roles with the JWT claims PostgREST would set and runs the same statement shapes the app sends. These are database permission tests, not tests of the server action's whitelist. Run it on staging after applying the migration, and once before to see the protected-column cases fail.

| Requirement | Cases |
|---|---|
| Learner saves name, phone, bio | #5–#8 (including the checkout and profile-editor statement shapes) |
| Cannot change email, id, is_active, must_change_password, avatar_url, timestamps | #9–#15 |
| Mixed allowed + protected update fails entirely | #16–#18 |
| Cannot modify or read another learner's profile | #19–#22 |
| Direct INSERT and upsert fail | #24–#26 |
| Email and Google-shaped signup create profiles | #1–#4 |
| Certificate name update works (real `issue_certificate`) | #30–#33 |
| Profile reads, greeting, completion panel | #27–#29 |
| Service role works; admin behaviour | #35–#38 |
| Signed-out visitors have no effect | anon cases |
| Privilege matrix, RLS and policies unchanged | last 5 cases |

### API-level checks (NOT RUN; staging only, never commit tokens)
With two staging test learners A and B (`$A_JWT`, `$B_ID`) from `POST $URL/auth/v1/token?grant_type=password`:
```bash
H=(-H "apikey: $ANON_KEY" -H "Authorization: Bearer $A_JWT" -H "Content-Type: application/json" -H "Prefer: return=representation")
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$A_ID" "${H[@]}" -d '{"full_name":"Staging A","phone":"9876543210","bio":"x"}'   # 200 + the row
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$A_ID" "${H[@]}" -d '{"is_active":false}'                                       # 403 {"code":"42501",...}
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$A_ID" "${H[@]}" -d '{"email":"x@example.invalid"}'                             # 403 (repeat for must_change_password, avatar_url, created_at, updated_at)
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$A_ID" "${H[@]}" -d '{"full_name":"M","is_active":false}'                       # 403; GET shows the name unchanged
curl -s -X PATCH "$URL/rest/v1/profiles?id=eq.$B_ID" "${H[@]}" -d '{"full_name":"Hacked"}'                                     # 200 []  (0 rows)
curl -s -X POST  "$URL/rest/v1/profiles"             "${H[@]}" -d "{\"id\":\"$A_ID\",\"full_name\":\"x\"}"                    # 403
curl -s -X POST  "$URL/rest/v1/profiles"             "${H[@]}" -H "Prefer: resolution=merge-duplicates" -d "{\"id\":\"$A_ID\",\"is_active\":false}"  # 403
curl -s          "$URL/rest/v1/profiles?id=eq.$A_ID&select=full_name,phone,bio" "${H[@]}"                                       # 200, own row
```
Then in the staging app: sign up with email, sign up with Google, save the profile page, enter a phone at checkout, issue a certificate for an eligible test learner, and confirm each result in the table.

## Results
**Throwaway local Postgres (PGlite 0.5.8, PostgreSQL 18.3 in WASM) with Supabase-style stubs for `auth`/`storage` and the three roles. This is a rehearsal, not staging, and it does not exercise PostgREST, Supabase Auth or the real project's grants.** Every repo migration replayed with 0 failures (50 tables); the `master_schema.sql` + follow-up-migrations path also replayed with 0 failures. Each ran with and without Supabase's broad default privileges.

| Scenario | Result |
|---|---|
| Before the migration (both build paths, both privilege profiles) | **30 pass / 16 fail**: email, is_active, must_change_password, avatar_url, created_at, updated_at writable; mixed update succeeds; upsert succeeds. Only `id` was already blocked, by the RLS check. The tests do detect the hole. |
| After the migration (4 combinations) | **46 / 46 pass** |
| Pre-existing column grant `UPDATE (is_active)` | removed by the table-level REVOKE; migration applies |
| Grant to `PUBLIC`, or inherited role with UPDATE or INSERT | migration **aborts** with a clear message; grants unchanged (all-or-nothing) |
| `authenticated` lacking SELECT beforehand | migration aborts |
| Applying the migration twice | OK, 46 / 46 |
| Rollback SQL after the migration | broad grants return; the same 16 protection cases fail again |

Not run: staging inspection, staging permission tests, PostgREST API checks, real email and Google signup end to end, any production step.

## Rollback — restores the ORIGINAL BROAD permissions
```sql
-- DOWN: puts back the original table-wide UPDATE and INSERT for learners.
-- This RE-OPENS the vulnerability: learners can again edit email, is_active, must_change_password,
-- avatar_url and timestamps on their own row, and insert profile rows.
GRANT UPDATE ON public.profiles TO authenticated;
GRANT INSERT ON public.profiles TO authenticated;
REVOKE UPDATE (full_name, phone, bio) ON public.profiles FROM authenticated;  -- optional tidy-up; the table-level grant covers them
```
Use it only if the migration breaks a flow you cannot fix forward; then fix the flow and re-apply.

## Consequences and observations
- **Future writers:** a new learner-editable column on `profiles` needs an explicit `GRANT UPDATE (col)` in its own migration (default is deny). Avatar upload will need one, plus validation.
- **Admins** share the `authenticated` role, so an admin cannot change `is_active`/`email` through the cookie client (test case documents this). Nothing in the app does today. Add a `SECURITY DEFINER` function with a `has_role(admin)` check and an `admin_audit_log` row when a feature needs it (deferred by decision).
- **Fresh databases** built from `supabase/master_schema.sql` still get the old broad grant until this migration is run after it. `docs/FRESH_DATABASE_SETUP.md` was not updated.
- **Not changed (out of scope):** if the project has Supabase's usual default privileges, `anon` and `authenticated` also hold DELETE/TRUNCATE on `profiles`. RLS blocks DELETE (no policy) and TRUNCATE is not reachable through the Data API. The rehearsal shows `anon` can neither read nor write rows. Worth tightening separately after q3/q5 are reviewed on the real database.
- **Missing profile rows:** a user without a row cannot create one any more (the profile page shows "Profile not found"). Check q9 before applying.
