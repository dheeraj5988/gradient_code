-- Internship applications: eligibility, apply/withdraw, admin pipeline, timeline.
-- Learners no longer insert applications directly; apply_internship() enforces eligibility in the database.

DROP POLICY IF EXISTS "own applications insert" ON public.internship_applications;
DROP POLICY IF EXISTS "admins update applications" ON public.internship_applications;
REVOKE INSERT, UPDATE, DELETE ON public.internship_applications FROM anon, authenticated;
GRANT SELECT ON public.internship_applications TO authenticated;
REVOKE ALL ON public.internship_applications FROM anon;

-- Timeline. `internal` notes are for admins only; other notes are visible to the applicant.
CREATE TABLE IF NOT EXISTS public.internship_application_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.internship_applications ON DELETE CASCADE,
  status public.application_status NOT NULL,
  note TEXT,
  internal BOOLEAN NOT NULL DEFAULT false,
  actor_id UUID REFERENCES auth.users ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS internship_events_app_idx ON public.internship_application_events (application_id, created_at);
ALTER TABLE public.internship_application_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.internship_application_events TO authenticated;
REVOKE ALL ON public.internship_application_events FROM anon;
DROP POLICY IF EXISTS "events readable by owner (non-internal) or admin" ON public.internship_application_events;
CREATE POLICY "events readable by owner (non-internal) or admin" ON public.internship_application_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR (NOT internal AND EXISTS (SELECT 1 FROM public.internship_applications a WHERE a.id = application_id AND a.user_id = auth.uid())));

-- Eligibility: published, before the deadline, and (if a course is required) a valid certificate for it.
CREATE OR REPLACE FUNCTION public.internship_eligibility(_internship_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); i public.internships%ROWTYPE; has_cert BOOLEAN := false; app public.internship_applications%ROWTYPE; ctitle TEXT; cslug TEXT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO i FROM public.internships WHERE id = _internship_id AND (is_published OR public.has_role(uid, 'admin'));
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;
  IF i.required_course_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.certificates c WHERE c.user_id = uid AND c.course_id = i.required_course_id AND c.revoked_at IS NULL) INTO has_cert;
    SELECT title, slug INTO ctitle, cslug FROM public.courses WHERE id = i.required_course_id;
  END IF;
  SELECT * INTO app FROM public.internship_applications WHERE internship_id = i.id AND user_id = uid;
  RETURN jsonb_build_object(
    'found', true,
    'open', i.is_published AND (i.apply_by IS NULL OR i.apply_by >= current_date),
    'deadline_passed', i.apply_by IS NOT NULL AND i.apply_by < current_date,
    'requires_course', i.required_course_id IS NOT NULL,
    'course_title', ctitle, 'course_slug', cslug,
    'course_met', i.required_course_id IS NULL OR has_cert,
    'applied', app.id IS NOT NULL, 'application_id', app.id, 'application_status', app.status,
    'eligible', i.is_published AND (i.apply_by IS NULL OR i.apply_by >= current_date) AND (i.required_course_id IS NULL OR has_cert) AND app.id IS NULL
  );
END $$;
REVOKE ALL ON FUNCTION public.internship_eligibility(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.internship_eligibility(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_internship(_internship_id UUID, _resume_url TEXT, _portfolio_url TEXT, _cover_note TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); el JSONB; aid UUID; resume TEXT := NULLIF(btrim(_resume_url), ''); portfolio TEXT := NULLIF(btrim(_portfolio_url), ''); note TEXT := btrim(COALESCE(_cover_note, ''));
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  el := public.internship_eligibility(_internship_id);
  IF NOT COALESCE((el->>'found')::BOOLEAN, false) THEN RAISE EXCEPTION 'not_found'; END IF;
  IF (el->>'applied')::BOOLEAN THEN RAISE EXCEPTION 'already_applied'; END IF;
  IF NOT (el->>'open')::BOOLEAN THEN RAISE EXCEPTION 'applications_closed'; END IF;
  IF NOT (el->>'course_met')::BOOLEAN THEN RAISE EXCEPTION 'course_requirement_not_met'; END IF;
  IF resume IS NULL OR length(resume) > 500 OR resume !~* '^https://[^[:space:]]{4,}$' THEN RAISE EXCEPTION 'resume_url_required'; END IF;
  IF portfolio IS NOT NULL AND (length(portfolio) > 500 OR portfolio !~* '^https://[^[:space:]]{4,}$') THEN RAISE EXCEPTION 'invalid_portfolio_url'; END IF;
  IF length(note) > 2000 THEN RAISE EXCEPTION 'note_too_long'; END IF;
  INSERT INTO public.internship_applications (internship_id, user_id, resume_url, portfolio_url, cover_note) VALUES (_internship_id, uid, resume, portfolio, note) RETURNING id INTO aid;
  INSERT INTO public.internship_application_events (application_id, status, note, actor_id) VALUES (aid, 'applied', 'Application submitted', uid);
  RETURN aid;
END $$;
REVOKE ALL ON FUNCTION public.apply_internship(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_internship(UUID, TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.withdraw_application(_application_id UUID) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.internship_applications%ROWTYPE;
BEGIN
  SELECT * INTO a FROM public.internship_applications WHERE id = _application_id AND user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status NOT IN ('applied', 'shortlisted', 'interview') THEN RAISE EXCEPTION 'cannot_withdraw'; END IF;
  UPDATE public.internship_applications SET status = 'withdrawn' WHERE id = a.id;
  INSERT INTO public.internship_application_events (application_id, status, note, actor_id) VALUES (a.id, 'withdrawn', 'Withdrawn by applicant', auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.withdraw_application(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.withdraw_application(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_application_status(_application_id UUID, _status public.application_status, _note TEXT DEFAULT NULL, _internal BOOLEAN DEFAULT false) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE a public.internship_applications%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO a FROM public.internship_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF a.status = 'withdrawn' THEN RAISE EXCEPTION 'application_withdrawn'; END IF;
  IF _status = 'withdrawn' THEN RAISE EXCEPTION 'invalid_status'; END IF;
  IF _status <> a.status THEN UPDATE public.internship_applications SET status = _status WHERE id = a.id; END IF;
  INSERT INTO public.internship_application_events (application_id, status, note, internal, actor_id) VALUES (a.id, _status, NULLIF(btrim(_note), ''), COALESCE(_internal, false), auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.admin_set_application_status(UUID, public.application_status, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_application_status(UUID, public.application_status, TEXT, BOOLEAN) TO authenticated;

-- Existing applications (if any) get a starting timeline entry.
INSERT INTO public.internship_application_events (application_id, status, note, created_at)
SELECT a.id, a.status, 'Application submitted', a.created_at FROM public.internship_applications a
WHERE NOT EXISTS (SELECT 1 FROM public.internship_application_events e WHERE e.application_id = a.id);
