-- =====================================================================
-- profiles: learners (the `authenticated` role) may UPDATE only full_name, phone and bio,
-- and may no longer INSERT at all.
--
-- Why: RLS on public.profiles limits WHICH ROW a user can change, not WHICH COLUMNS. With the
-- table-wide UPDATE grant, a signed-in learner could rewrite their own email (admin tools look
-- people up by it), is_active, must_change_password, avatar_url and created_at.
--
-- What keeps working (all run as the function owner or service_role, not as `authenticated`):
--   * signup / Google signup: handle_new_user() trigger (SECURITY DEFINER) inserts the row
--   * issue_certificate() (SECURITY DEFINER) sets full_name when it is blank
--   * server-side/admin reads and service_role writes
-- Learner SELECT and every RLS policy are unchanged. The profile editor and the checkout phone
-- update only write full_name / phone / bio, so they are unaffected.
--
-- Rollback (restores the ORIGINAL BROAD permissions, i.e. re-opens the hole): see
-- docs/PROFILES_COLUMN_GRANTS.md.
-- =====================================================================

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone, bio) ON public.profiles TO authenticated;
REVOKE INSERT ON public.profiles FROM authenticated;

-- Self-check. has_*_privilege() also counts grants to PUBLIC and to roles `authenticated`
-- inherits from, so this aborts (and rolls the whole migration back) if the statements above
-- were not enough on the database this runs against.
DO $$
DECLARE
  col TEXT;
  leaked TEXT[] := '{}';
BEGIN
  FOREACH col IN ARRAY ARRAY['id', 'email', 'avatar_url', 'is_active', 'must_change_password', 'created_at', 'updated_at'] LOOP
    IF has_column_privilege('authenticated', 'public.profiles', col, 'UPDATE') THEN leaked := leaked || col; END IF;
  END LOOP;
  IF array_length(leaked, 1) > 0 THEN
    RAISE EXCEPTION 'profiles: authenticated can still UPDATE protected column(s) %. Look for a grant to PUBLIC or to a role that authenticated inherits from.', leaked;
  END IF;

  FOREACH col IN ARRAY ARRAY['full_name', 'phone', 'bio'] LOOP
    IF NOT has_column_privilege('authenticated', 'public.profiles', col, 'UPDATE') THEN
      RAISE EXCEPTION 'profiles: authenticated lost UPDATE on %.', col;
    END IF;
  END LOOP;

  IF has_any_column_privilege('authenticated', 'public.profiles', 'INSERT') THEN
    RAISE EXCEPTION 'profiles: authenticated can still INSERT (a grant to PUBLIC or an inherited role?).';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.profiles', 'SELECT') THEN
    RAISE EXCEPTION 'profiles: authenticated lost SELECT.';
  END IF;
END $$;
