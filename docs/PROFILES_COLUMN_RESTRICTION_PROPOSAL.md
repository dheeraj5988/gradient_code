# Proposal: restrict which `profiles` columns a learner can update

**Status:** proposal only. Nothing here is applied. The SQL below is deliberately **not** in `supabase/migrations/`; once approved, copy it into a new timestamped migration and test it on a Supabase branch or staging project first.

## The problem
`public.profiles` has `GRANT SELECT, INSERT, UPDATE … TO authenticated` (table-wide) and the policy `own profile write`: `USING/WITH CHECK (id = auth.uid() OR has_role(auth.uid(),'admin'))`. RLS limits *which row* a user can change, not *which columns*. Through the public API, any signed-in learner can therefore set on their own row:

| Column | Impact today |
|---|---|
| `email` | Admin tools look learners up by `profiles.email` (`admin/user-actions.ts`, `admin/referrals/actions.ts`, `admin/enrollments`). A learner who copies another person's email can make `maybeSingle()` lookups ambiguous or error, or get picked by an admin granting access by email. **Highest-impact column.** |
| `is_active` | Read by the admin student pages only. Nothing in the app enforces it, so impact is limited today, but a future "deactivate" feature would be bypassable. |
| `must_change_password` | Not referenced anywhere in `src/`. Same future risk. |
| `created_at`, `avatar_url` | Cosmetic / data integrity. `avatar_url` becomes an arbitrary external URL once avatars are shown. |

## What writes `profiles` today (checked in the repo)
| Writer | Runs as | Columns |
|---|---|---|
| `handle_new_user()` trigger (signup, incl. Google) | `SECURITY DEFINER` (owner) | INSERT `id, full_name, email` |
| `issue_certificate()` RPC (3 migrations) | `SECURITY DEFINER` | `full_name` |
| Checkout `startPayment` | learner via cookie client | `phone` |
| New profile editor (`dashboard/profile/actions.ts`) | learner via cookie client | `full_name, phone, bio` |
| Admin pages | read only | none (`admin/students` is read-only; nothing in `src/app/admin` updates `profiles`) |

Admins use the same `authenticated` database role as learners, so a column privilege cannot tell them apart. Because no admin code writes `profiles`, this does not break anything today; it does mean any future admin "edit student status" must go through an RPC or the service role.

## Recommended fix (narrow): column-level UPDATE grants
```sql
-- UP
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT  UPDATE (full_name, phone, bio) ON public.profiles TO authenticated;
-- avatar_url is excluded on purpose until an upload flow with validation exists.
```
`service_role` keeps `GRANT ALL`. `SECURITY DEFINER` functions run as the owner, so signup and `issue_certificate` are unaffected. The `profiles_updated` trigger still sets `updated_at`. RLS is unchanged, so a learner still cannot touch another row.

Optional second statement (also narrow): signup is the only legitimate INSERT and it is a definer trigger, so the learner INSERT grant is unused. Closing it stops a learner who somehow lacks a row from inserting one with privileged columns:
```sql
REVOKE INSERT ON public.profiles FROM authenticated;
```

### If/when admins need to edit status or email
Add an RPC rather than loosening the grant, e.g. `admin_set_profile_status(_user uuid, _is_active boolean, _must_change boolean)` as `SECURITY DEFINER`, `SET search_path = public`, that raises unless `has_role(auth.uid(),'admin')` and writes an `admin_audit_log` row. Not needed until a feature uses it.

### Alternative considered: `BEFORE UPDATE` trigger
A trigger that rejects changes to protected columns unless `has_role(auth.uid(),'admin')` would let admins keep editing through the cookie client. It is more code, easier to get wrong (definer vs invoker `current_user`), and no admin path needs it today. Choose it only if a direct admin edit path is added first.

## Rollback
```sql
-- DOWN
GRANT UPDATE ON public.profiles TO authenticated;   -- restores the table-wide privilege (covers every column)
GRANT INSERT ON public.profiles TO authenticated;   -- only if the optional REVOKE INSERT was applied
```

## Tests to run on staging (psql; replace the UUIDs with two test learners A, B and one admin)
Use `SET ROLE authenticated; SELECT set_config('request.jwt.claims', '{"sub":"<uuid>","role":"authenticated"}', true);` inside a transaction, and `ROLLBACK` after each.

| # | As | Statement | Expected after the fix |
|---|---|---|---|
| 1 | A | `UPDATE profiles SET full_name='X', phone='9876543210', bio='b' WHERE id=A` | 1 row updated |
| 2 | A | `UPDATE profiles SET is_active=false WHERE id=A` | `ERROR 42501 permission denied` |
| 3 | A | same for `email`, `must_change_password`, `created_at`, `avatar_url` | each `42501` |
| 4 | A | `UPDATE profiles SET full_name='X', is_active=false WHERE id=A` (mixed) | whole statement `42501`, nothing changes |
| 5 | A | `UPDATE profiles SET full_name='Hacked' WHERE id=B` | 0 rows (RLS) |
| 6 | admin | `UPDATE profiles SET is_active=false WHERE id=B` | `42501` (expected; use the RPC) |
| 7 | service role | `UPDATE profiles SET is_active=false WHERE id=B` | succeeds |
| 8 | — | create an auth user (email and Google) | profile row created by trigger with `email` |
| 9 | A (blank name) | `SELECT issue_certificate(<course>, 'Name')` | still fills `full_name` |
| 10 | A | checkout phone update `UPDATE profiles SET phone=… WHERE id=A` | succeeds |
| 11 | — | `SELECT has_column_privilege('authenticated','public.profiles','full_name','UPDATE')` → `true`; same for `is_active`, `email` → `false` | as stated |

App-level check after applying: save the profile form (name, phone, bio) and complete a checkout phone entry; both must still work.

## Decision needed
Approve (a) the column grants, (b) the optional INSERT revoke, and (c) whether an admin status RPC is wanted now or later.
