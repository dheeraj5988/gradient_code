-- =====================================================================
-- Permission tests for 20261002120000_restrict_profiles_writes.sql
--
-- Run on a STAGING database (never production) in the Supabase SQL editor or psql, AFTER applying
-- the migration. Everything happens in one transaction that ends in ROLLBACK, so nothing persists.
-- Running it BEFORE the migration is useful too: the protected-column and INSERT tests should FAIL,
-- which proves the tests can detect the hole.
--
-- Each case switches to the real `authenticated` (or `service_role`) database role with the JWT
-- claims PostgREST would set, then runs the same statement shape the app/API sends. These are
-- database permission tests, not tests of the server action's field whitelist.
-- Result: one row per case; the last column must read PASS for every row.
-- =====================================================================
BEGIN;

-- ---------- fixtures (fixed IDs so output is readable) ----------
-- Created through the real signup trigger (on_auth_user_created -> handle_new_user).
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'learner-a@example.invalid', '{"full_name":"Learner A"}'),                                   -- email signup
  ('bbbbbbbb-0000-4000-8000-000000000002', 'learner-b@example.invalid', '{"full_name":"Learner B"}'),                                   -- email signup
  ('cccccccc-0000-4000-8000-000000000003', 'google-c@example.invalid',  '{"full_name":"Google C","name":"Google C","iss":"https://accounts.google.com","provider_id":"1"}'), -- Google-shaped metadata
  ('dddddddd-0000-4000-8000-000000000004', 'blank-d@example.invalid',   '{}'),                                                           -- no name -> blank profile name
  ('eeeeeeee-0000-4000-8000-000000000005', 'admin-e@example.invalid',   '{"full_name":"Admin E"}'),
  ('ffffffff-0000-4000-8000-000000000006', 'orphan-f@example.invalid',  '{"full_name":"Orphan F"}');
INSERT INTO public.user_roles (user_id, role) VALUES ('eeeeeeee-0000-4000-8000-000000000005', 'admin') ON CONFLICT DO NOTHING;

-- Certificate fixture: a course D is enrolled in and has fully completed, with a policy that is enabled.
INSERT INTO public.courses (id, title, slug, is_published, price) VALUES ('99999999-0000-4000-8000-0000000000c1', 'Test course', 'test-course-grants', true, 100);
INSERT INTO public.course_modules (id, course_id, title, order_index) VALUES ('99999999-0000-4000-8000-0000000000d1', '99999999-0000-4000-8000-0000000000c1', 'M1', 1);
INSERT INTO public.lessons (id, module_id, title, type, order_index, is_published, is_required) VALUES ('99999999-0000-4000-8000-0000000000e1', '99999999-0000-4000-8000-0000000000d1', 'L1', 'video', 1, true, true);
INSERT INTO public.enrollments (user_id, course_id) VALUES ('dddddddd-0000-4000-8000-000000000004', '99999999-0000-4000-8000-0000000000c1');
INSERT INTO public.lesson_progress (user_id, lesson_id) VALUES ('dddddddd-0000-4000-8000-000000000004', '99999999-0000-4000-8000-0000000000e1');
INSERT INTO public.certificate_policies (course_id, enabled, min_lessons_pct, min_practice_pct, code) VALUES ('99999999-0000-4000-8000-0000000000c1', true, 100, 0, 'TST');

-- ---------- helpers ----------
CREATE TEMP TABLE results (n serial, test text, expected text, actual text);

-- Runs _sql as `authenticated` with _uid's claims; returns 'OK rows=N' or 'DENIED: <message>' or 'ERROR <state>: <message>'.
CREATE FUNCTION pg_temp.as_user(_uid uuid, _sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', _uid::text, true);
  PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
  PERFORM set_config('request.jwt.claims', json_build_object('sub', _uid, 'role', 'authenticated')::text, true);
  SET LOCAL ROLE authenticated;
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN 'OK rows=' || n;
  EXCEPTION
    WHEN insufficient_privilege THEN RESET ROLE; RETURN 'DENIED: ' || SQLERRM;
    WHEN OTHERS THEN RESET ROLE; RETURN 'ERROR ' || SQLSTATE || ': ' || SQLERRM;
  END;
END $f$;

CREATE FUNCTION pg_temp.as_anon(_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '', true);
  PERFORM set_config('request.jwt.claim.role', 'anon', true);
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  SET LOCAL ROLE anon;
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN 'OK rows=' || n;
  EXCEPTION
    WHEN insufficient_privilege THEN RESET ROLE; RETURN 'DENIED: ' || SQLERRM;
    WHEN OTHERS THEN RESET ROLE; RETURN 'ERROR ' || SQLSTATE || ': ' || SQLERRM;
  END;
END $f$;

CREATE FUNCTION pg_temp.as_service(_sql text) RETURNS text LANGUAGE plpgsql AS $f$
DECLARE n bigint;
BEGIN
  PERFORM set_config('request.jwt.claim.role', 'service_role', true);
  SET LOCAL ROLE service_role;
  BEGIN
    EXECUTE _sql;
    GET DIAGNOSTICS n = ROW_COUNT;
    RESET ROLE;
    RETURN 'OK rows=' || n;
  EXCEPTION WHEN OTHERS THEN RESET ROLE; RETURN 'ERROR ' || SQLSTATE || ': ' || SQLERRM;
  END;
END $f$;

-- expected is a regular expression matched against the actual text.
CREATE FUNCTION pg_temp.expect(_test text, _expected text, _actual text) RETURNS void LANGUAGE sql AS
$f$ INSERT INTO results (test, expected, actual) VALUES (_test, _expected, _actual) $f$;

-- ---------- 1. signup created profiles through the trigger ----------
SELECT pg_temp.expect('signup (email): profile row + name + email', '^Learner A\|learner-a@example.invalid$',
  (SELECT full_name || '|' || email FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'));
SELECT pg_temp.expect('signup (Google-shaped metadata): profile row + name + email', '^Google C\|google-c@example.invalid$',
  (SELECT full_name || '|' || email FROM public.profiles WHERE id = 'cccccccc-0000-4000-8000-000000000003'));
SELECT pg_temp.expect('signup: default student role created', '^1$',
  (SELECT count(*)::text FROM public.user_roles WHERE user_id = 'aaaaaaaa-0000-4000-8000-000000000001' AND role = 'student'));
SELECT pg_temp.expect('signup without a name: profile row with blank name', '^\|blank-d@example.invalid$',
  (SELECT full_name || '|' || email FROM public.profiles WHERE id = 'dddddddd-0000-4000-8000-000000000004'));

-- ---------- 2. allowed learner writes ----------
SELECT pg_temp.expect('A saves full_name + phone + bio', '^OK rows=1$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET full_name = 'Learner A Updated', phone = '9876543210', bio = 'Hello' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A changes are stored', '^Learner A Updated\|9876543210\|Hello$',
  (SELECT full_name || '|' || phone || '|' || bio FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'));
SELECT pg_temp.expect('checkout phone update shape (.update({phone}).eq(id))', '^OK rows=1$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET phone = '9123456780' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('profile editor shape (update ... RETURNING id)', '^OK rows=1$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET full_name = 'Learner A', phone = NULL, bio = NULL WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001' RETURNING id$$));

-- ---------- 3. protected columns are denied ----------
SELECT pg_temp.expect('A cannot change email',                '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET email = 'someone-else@example.invalid' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change id',                   '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET id = gen_random_uuid() WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change is_active',            '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET is_active = false WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change must_change_password', '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET must_change_password = true WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change avatar_url',           '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET avatar_url = 'https://evil.example.invalid/x.png' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change created_at',           '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET created_at = now() - interval '5 years' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('A cannot change updated_at',           '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET updated_at = now() - interval '5 years' WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));

-- mixed allowed + protected: the whole statement must fail and nothing may change
SELECT pg_temp.expect('mixed allowed+protected update is denied', '^DENIED: permission denied for table profiles$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET full_name = 'Mixed Attempt', is_active = false WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('mixed update changed nothing (name unchanged, still active)', '^Learner A\|true$',
  (SELECT full_name || '|' || is_active::text FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'));
SELECT pg_temp.expect('protected values still intact (email, must_change_password, avatar_url)', '^learner-a@example.invalid\|false\|$',
  (SELECT email || '|' || must_change_password::text || '|' || coalesce(avatar_url, '') FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'));

-- ---------- 4. other learners' rows ----------
SELECT pg_temp.expect('A updating B (allowed column) affects 0 rows (RLS)', '^OK rows=0$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET full_name = 'Hacked' WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'$$));
SELECT pg_temp.expect('A updating every row only reaches A''s own row', '^OK rows=1$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$UPDATE public.profiles SET bio = 'sweep'$$));
SELECT pg_temp.expect('B unchanged after A''s attempts', '^Learner B\|$',
  (SELECT full_name || '|' || coalesce(bio, '') FROM public.profiles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'));
SELECT pg_temp.expect('A cannot read B''s profile (RLS)', '^OK rows=0$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$SELECT full_name FROM public.profiles WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'$$));
SELECT pg_temp.expect('A cannot DELETE profiles (privilege or RLS)', '^(OK rows=0|DENIED: permission denied for table profiles)$',
  pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$DELETE FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));

-- ---------- 5. direct learner INSERT ----------
SELECT pg_temp.expect('direct INSERT of own id is denied',          '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$INSERT INTO public.profiles (id, full_name) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'x')$$));
SELECT pg_temp.expect('direct INSERT with protected columns denied', '^DENIED: permission denied for table profiles$', pg_temp.as_user('ffffffff-0000-4000-8000-000000000006', $$INSERT INTO public.profiles (id, email, is_active, must_change_password) VALUES ('ffffffff-0000-4000-8000-000000000006', 'x@example.invalid', true, false)$$));
SELECT pg_temp.expect('upsert (INSERT .. ON CONFLICT DO UPDATE) denied', '^DENIED: permission denied for table profiles$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$INSERT INTO public.profiles (id, full_name) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', 'x') ON CONFLICT (id) DO UPDATE SET is_active = false$$));

-- ---------- 6. reads (profile page, dashboard greeting, completion panel) ----------
SELECT pg_temp.expect('getMyProfile read shape (full_name, phone, bio)', '^OK rows=1$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$SELECT full_name, phone, bio FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('getLearnerSummary read shape (incl. email, avatar_url)', '^OK rows=1$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$SELECT full_name, email, phone, avatar_url, bio FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));
SELECT pg_temp.expect('certificate page read shape (full_name)', '^OK rows=1$', pg_temp.as_user('aaaaaaaa-0000-4000-8000-000000000001', $$SELECT full_name FROM public.profiles WHERE id = 'aaaaaaaa-0000-4000-8000-000000000001'$$));

-- ---------- 7. certificate function keeps its privilege (real issue_certificate, SECURITY DEFINER) ----------
SELECT pg_temp.expect('issue_certificate runs for an eligible learner', '^OK rows=1$',
  pg_temp.as_user('dddddddd-0000-4000-8000-000000000004', $$SELECT public.issue_certificate('99999999-0000-4000-8000-0000000000c1', 'Learner D Certified')$$));
SELECT pg_temp.expect('issue_certificate filled the blank profile name', '^Learner D Certified$',
  (SELECT full_name FROM public.profiles WHERE id = 'dddddddd-0000-4000-8000-000000000004'));
SELECT pg_temp.expect('issue_certificate is SECURITY DEFINER and not owned by authenticated', '^true\|(?!authenticated$).+$',
  (SELECT p.prosecdef::text || '|' || pg_get_userbyid(p.proowner) FROM pg_proc p WHERE p.oid = 'public.issue_certificate(uuid,text)'::regprocedure));
SELECT pg_temp.expect('handle_new_user is SECURITY DEFINER and not owned by authenticated', '^true\|(?!authenticated$).+$',
  (SELECT p.prosecdef::text || '|' || pg_get_userbyid(p.proowner) FROM pg_proc p WHERE p.oid = 'public.handle_new_user()'::regprocedure));
SELECT pg_temp.expect('signup trigger exists and is enabled', '^O$',
  (SELECT tgenabled::text FROM pg_trigger WHERE tgname = 'on_auth_user_created' AND NOT tgisinternal));

-- ---------- 8. admin and service role ----------
SELECT pg_temp.expect('admin may still edit an allowed column on another learner (RLS admin clause)', '^OK rows=1$',
  pg_temp.as_user('eeeeeeee-0000-4000-8000-000000000005', $$UPDATE public.profiles SET bio = 'admin note' WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'$$));
SELECT pg_temp.expect('EXPECTED CONSEQUENCE: admin via the authenticated role cannot change is_active', '^DENIED: permission denied for table profiles$',
  pg_temp.as_user('eeeeeeee-0000-4000-8000-000000000005', $$UPDATE public.profiles SET is_active = false WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'$$));
SELECT pg_temp.expect('service_role can update protected columns', '^OK rows=1$',
  pg_temp.as_service($$UPDATE public.profiles SET is_active = false, email = 'service-changed@example.invalid' WHERE id = 'bbbbbbbb-0000-4000-8000-000000000002'$$));
DELETE FROM public.profiles WHERE id = 'ffffffff-0000-4000-8000-000000000006';
SELECT pg_temp.expect('service_role can INSERT a profile (backfill path)', '^OK rows=1$',
  pg_temp.as_service($$INSERT INTO public.profiles (id, full_name, email) VALUES ('ffffffff-0000-4000-8000-000000000006', 'Orphan F', 'orphan-f@example.invalid')$$));

-- ---------- 8b. signed-out (anon) visitors: no effect, whatever default privileges the project has ----------
SELECT pg_temp.expect('anon UPDATE has no effect', '^(OK rows=0|DENIED: permission denied for table profiles)$',
  pg_temp.as_anon($$UPDATE public.profiles SET full_name = 'anon'$$));
SELECT pg_temp.expect('anon INSERT is rejected', '^DENIED: (permission denied for table profiles|new row violates row-level security policy.*)$',
  pg_temp.as_anon($$INSERT INTO public.profiles (id, full_name) VALUES (gen_random_uuid(), 'anon')$$));
SELECT pg_temp.expect('anon cannot read profiles', '^(OK rows=0|DENIED: permission denied for table profiles)$',
  pg_temp.as_anon($$SELECT * FROM public.profiles$$));

-- ---------- 9. privilege matrix (what the catalog says) ----------
SELECT pg_temp.expect('authenticated UPDATE allowed on exactly {bio, full_name, phone}', '^bio,full_name,phone$',
  (SELECT string_agg(attname, ',' ORDER BY attname) FROM pg_attribute WHERE attrelid = 'public.profiles'::regclass AND attnum > 0 AND NOT attisdropped
     AND has_column_privilege('authenticated', 'public.profiles', attname, 'UPDATE')));
SELECT pg_temp.expect('authenticated has no INSERT privilege on any column', '^false$', has_any_column_privilege('authenticated', 'public.profiles', 'INSERT')::text);
SELECT pg_temp.expect('authenticated keeps table SELECT', '^true$', has_table_privilege('authenticated', 'public.profiles', 'SELECT')::text);
SELECT pg_temp.expect('RLS still enabled on profiles', '^true$', (SELECT relrowsecurity::text FROM pg_class WHERE oid = 'public.profiles'::regclass));
SELECT pg_temp.expect('the three original RLS policies are unchanged', '^own profile insert,own profile read,own profile write$',
  (SELECT string_agg(policyname, ',' ORDER BY policyname) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles'));

-- ---------- result ----------
SELECT n, test, expected, actual, CASE WHEN actual ~ expected THEN 'PASS' ELSE 'FAIL' END AS result FROM results ORDER BY n;
SELECT count(*) FILTER (WHERE actual ~ expected) AS passed, count(*) FILTER (WHERE actual !~ expected) AS failed FROM results;

ROLLBACK;
