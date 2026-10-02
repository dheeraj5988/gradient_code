-- =====================================================================
-- READ-ONLY inspection of the REAL grants on public.profiles. Run on the target database
-- (staging first) BEFORE applying 20261002120000_restrict_profiles_writes.sql, and again after.
-- Repository migrations do not prove the live configuration: roles can hold extra grants,
-- inherit from other roles, or have manual changes the repo never saw. Nothing here writes.
-- =====================================================================

-- 1. Table owner, RLS flags, raw ACLs (relacl = table-level grants; the trailing /role is the grantor)
SELECT c.relname, pg_get_userbyid(c.relowner) AS owner, c.relrowsecurity AS rls_on, c.relforcerowsecurity AS rls_forced, c.relacl AS table_acl
FROM pg_class c WHERE c.oid = 'public.profiles'::regclass;

-- 2. Column-level ACLs (attacl is non-null only when a column has its own grant)
SELECT a.attname, a.attacl AS column_acl
FROM pg_attribute a WHERE a.attrelid = 'public.profiles'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND a.attacl IS NOT NULL;

-- 3. Effective privileges per role (accounts for PUBLIC and role inheritance), per column
SELECT r.rolname,
       has_table_privilege(r.oid, 'public.profiles', 'SELECT') AS tbl_select,
       has_table_privilege(r.oid, 'public.profiles', 'INSERT') AS tbl_insert,
       has_table_privilege(r.oid, 'public.profiles', 'UPDATE') AS tbl_update,
       has_table_privilege(r.oid, 'public.profiles', 'DELETE') AS tbl_delete,
       (SELECT string_agg(attname, ',' ORDER BY attname) FROM pg_attribute
         WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
           AND has_column_privilege(r.oid, 'public.profiles', attname, 'UPDATE')) AS updatable_columns
FROM pg_roles r WHERE r.rolname IN ('anon', 'authenticated', 'service_role', 'postgres', 'authenticator') ORDER BY r.rolname;

-- 4. Inherited permissions: which roles does `authenticated` belong to (and with INHERIT)? Anything unexpected here can grant UPDATE/INSERT indirectly.
SELECT g.rolname AS member, g.rolinherit AS member_inherits, r.rolname AS member_of
FROM pg_auth_members m JOIN pg_roles r ON r.oid = m.roleid JOIN pg_roles g ON g.oid = m.member
WHERE g.rolname IN ('authenticated', 'anon') ORDER BY 1, 2;

-- 5. Default privileges: Supabase projects usually grant ALL on new public tables to anon/authenticated/service_role.
SELECT pg_get_userbyid(d.defaclrole) AS for_role, d.defaclobjtype AS obj, d.defaclacl AS default_acl
FROM pg_default_acl d JOIN pg_namespace n ON n.oid = d.defaclnamespace WHERE n.nspname = 'public';

-- 6. Policies on profiles (the migration must leave these unchanged: own profile read / write / insert)
SELECT policyname, cmd, roles, qual, with_check FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' ORDER BY policyname;

-- 7. Triggers on profiles and on auth.users (signup must still create profiles)
SELECT tgrelid::regclass AS on_table, tgname, tgenabled, pg_get_triggerdef(t.oid) AS definition
FROM pg_trigger t WHERE NOT tgisinternal AND tgrelid IN ('public.profiles'::regclass, 'auth.users'::regclass) ORDER BY 1, 2;

-- 8. Functions that write profiles: owner and SECURITY DEFINER (they must be owned by a role other than `authenticated` and keep their own privileges)
SELECT p.oid::regprocedure AS function, pg_get_userbyid(p.proowner) AS owner, p.prosecdef AS security_definer, p.proconfig AS settings,
       has_table_privilege(p.proowner, 'public.profiles', 'INSERT') AS owner_can_insert,
       has_column_privilege(p.proowner, 'public.profiles', 'full_name', 'UPDATE') AS owner_can_update_name
FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname IN ('handle_new_user', 'issue_certificate', 'update_updated_at_column') ORDER BY 1;
-- Any other function that mentions the table (review by eye; none are expected beyond the above):
SELECT p.oid::regprocedure AS function, pg_get_userbyid(p.proowner) AS owner, p.prosecdef
FROM pg_proc p WHERE p.pronamespace IN ('public'::regnamespace, 'auth'::regnamespace) AND p.prosrc ~* '(insert\s+into|update|delete\s+from)\s+(public\.)?profiles\y' ORDER BY 1;

-- 9. Signup coverage: auth users WITHOUT a profile row. After the migration a learner can no longer
--    insert their own row, so any such user would have no way to get one. Expect zero rows; if not,
--    backfill with the service role before applying.
SELECT u.id, u.email, u.created_at FROM auth.users u LEFT JOIN public.profiles p ON p.id = u.id WHERE p.id IS NULL ORDER BY u.created_at;
