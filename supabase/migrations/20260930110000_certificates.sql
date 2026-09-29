-- Certificate policies, server-side eligibility, issuance, public verification, revocation.
-- Students can never insert certificates directly; issue_certificate() recomputes eligibility inside the database.

-- 1. Per-course policy (default: certificate disabled until an admin turns it on)
CREATE TABLE IF NOT EXISTS public.certificate_policies (
  course_id UUID PRIMARY KEY REFERENCES public.courses ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  min_lessons_pct INTEGER NOT NULL DEFAULT 100 CHECK (min_lessons_pct BETWEEN 0 AND 100),   -- of required + published lessons
  min_practice_pct INTEGER NOT NULL DEFAULT 0 CHECK (min_practice_pct BETWEEN 0 AND 100),    -- of published practice questions answered correctly
  code TEXT CHECK (code IS NULL OR code ~ '^[A-Z0-9]{2,8}$'),                                 -- appears in the credential ID
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.certificate_policies ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE ON public.certificate_policies TO authenticated;
DROP POLICY IF EXISTS "policies readable by enrolled or admin" ON public.certificate_policies;
CREATE POLICY "policies readable by enrolled or admin" ON public.certificate_policies FOR SELECT TO authenticated
  USING (public.can_access_course(course_id) OR public.has_role(auth.uid(), 'admin'));
DROP POLICY IF EXISTS "admins write certificate policies" ON public.certificate_policies;
CREATE POLICY "admins write certificate policies" ON public.certificate_policies FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
REVOKE ALL ON public.certificate_policies FROM anon;

-- 2. Snapshot + revocation columns on certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS holder_name TEXT,
  ADD COLUMN IF NOT EXISTS course_title TEXT,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_reason TEXT;
UPDATE public.certificates c SET course_title = co.title FROM public.courses co WHERE co.id = c.course_id AND c.course_title IS NULL;
UPDATE public.certificates c SET holder_name = NULLIF(p.full_name, '') FROM public.profiles p WHERE p.id = c.user_id AND c.holder_name IS NULL;

-- 3. Eligibility (recomputed every time, from database facts only)
CREATE OR REPLACE FUNCTION public.certificate_eligibility(_course_id UUID) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); pol public.certificate_policies%ROWTYPE; enrolled BOOLEAN;
  l_total INT; l_done INT; p_total INT; p_done INT; l_pct INT; p_pct INT; l_met BOOLEAN; p_met BOOLEAN; cert public.certificates%ROWTYPE;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  enrolled := public.can_access_course(_course_id);
  SELECT * INTO pol FROM public.certificate_policies WHERE course_id = _course_id;
  SELECT count(*) INTO l_total FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    WHERE m.course_id = _course_id AND l.is_required AND l.is_published;
  SELECT count(*) INTO l_done FROM public.lessons l JOIN public.course_modules m ON m.id = l.module_id
    JOIN public.lesson_progress lp ON lp.lesson_id = l.id AND lp.user_id = uid
    WHERE m.course_id = _course_id AND l.is_required AND l.is_published;
  SELECT count(*) INTO p_total FROM public.practice_questions q WHERE q.course_id = _course_id AND q.category = 'practice' AND q.is_published;
  SELECT count(DISTINCT q.id) INTO p_done FROM public.practice_questions q JOIN public.question_attempts a ON a.question_id = q.id AND a.user_id = uid AND a.is_correct IS TRUE
    WHERE q.course_id = _course_id AND q.category = 'practice' AND q.is_published;
  l_pct := CASE WHEN l_total = 0 THEN 0 ELSE floor(100.0 * l_done / l_total)::INT END;
  p_pct := CASE WHEN p_total = 0 THEN 100 ELSE floor(100.0 * p_done / p_total)::INT END;
  l_met := l_total > 0 AND l_pct >= COALESCE(pol.min_lessons_pct, 100);
  p_met := p_pct >= COALESCE(pol.min_practice_pct, 0);
  SELECT * INTO cert FROM public.certificates WHERE user_id = uid AND course_id = _course_id;
  RETURN jsonb_build_object(
    'enabled', COALESCE(pol.enabled, false), 'enrolled', enrolled,
    'lessons', jsonb_build_object('done', l_done, 'total', l_total, 'pct', l_pct, 'required_pct', COALESCE(pol.min_lessons_pct, 100), 'met', l_met),
    'practice', jsonb_build_object('done', p_done, 'total', p_total, 'pct', p_pct, 'required_pct', COALESCE(pol.min_practice_pct, 0), 'met', p_met),
    'eligible', COALESCE(pol.enabled, false) AND enrolled AND l_met AND p_met,
    'certificate', CASE WHEN cert.id IS NULL THEN NULL ELSE jsonb_build_object('number', cert.certificate_number, 'issued_at', cert.issued_at, 'revoked', cert.revoked_at IS NOT NULL) END
  );
END $$;
REVOKE ALL ON FUNCTION public.certificate_eligibility(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.certificate_eligibility(UUID) TO authenticated;

-- 4. Issuance (the ONLY way a learner obtains a certificate)
CREATE OR REPLACE FUNCTION public.issue_certificate(_course_id UUID, _holder_name TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); el JSONB; nm TEXT := btrim(regexp_replace(COALESCE(_holder_name, ''), '\s+', ' ', 'g'));
  existing TEXT; pol_code TEXT; ctitle TEXT; num TEXT; tries INT := 0; alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; tok TEXT; i INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT certificate_number INTO existing FROM public.certificates WHERE user_id = uid AND course_id = _course_id;
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  IF length(nm) NOT BETWEEN 2 AND 80 THEN RAISE EXCEPTION 'name_required'; END IF;
  el := public.certificate_eligibility(_course_id);
  IF NOT (el->>'eligible')::BOOLEAN THEN RAISE EXCEPTION 'not_eligible'; END IF;
  SELECT title INTO ctitle FROM public.courses WHERE id = _course_id;
  SELECT code INTO pol_code FROM public.certificate_policies WHERE course_id = _course_id;
  LOOP
    tok := '';
    FOR i IN 1..8 LOOP tok := tok || substr(alphabet, 1 + floor(random() * length(alphabet))::INT, 1); END LOOP;
    num := 'GC-' || to_char(now(), 'YYYY') || '-' || COALESCE(pol_code, 'CRS') || '-' || tok;
    BEGIN
      INSERT INTO public.certificates (user_id, course_id, certificate_number, holder_name, course_title) VALUES (uid, _course_id, num, nm, ctitle);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      SELECT certificate_number INTO existing FROM public.certificates WHERE user_id = uid AND course_id = _course_id;
      IF existing IS NOT NULL THEN RETURN existing; END IF;
      tries := tries + 1; IF tries > 10 THEN RAISE EXCEPTION 'could_not_generate_number'; END IF;
    END;
  END LOOP;
  UPDATE public.profiles SET full_name = nm WHERE id = uid AND COALESCE(btrim(full_name), '') = '';
  RETURN num;
END $$;
REVOKE ALL ON FUNCTION public.issue_certificate(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_certificate(UUID, TEXT) TO authenticated;

-- 5. Public verification — returns only what a verifier needs
CREATE OR REPLACE FUNCTION public.verify_certificate(_number TEXT) RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object('valid', c.revoked_at IS NULL, 'revoked', c.revoked_at IS NOT NULL, 'number', c.certificate_number,
      'holder_name', COALESCE(c.holder_name, p.full_name), 'course_title', COALESCE(c.course_title, co.title), 'issued_at', c.issued_at)
    FROM public.certificates c LEFT JOIN public.profiles p ON p.id = c.user_id LEFT JOIN public.courses co ON co.id = c.course_id
    WHERE c.certificate_number = upper(btrim(_number))
  ), jsonb_build_object('valid', false, 'revoked', false, 'not_found', true));
$$;
REVOKE ALL ON FUNCTION public.verify_certificate(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_certificate(TEXT) TO anon, authenticated;

-- 6. Revocation (admin). Certificates are never edited, only revoked/reinstated.
CREATE OR REPLACE FUNCTION public.admin_set_certificate_revoked(_id UUID, _revoked BOOLEAN, _reason TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  IF _revoked AND COALESCE(btrim(_reason), '') = '' THEN RAISE EXCEPTION 'reason_required'; END IF;
  UPDATE public.certificates SET revoked_at = CASE WHEN _revoked THEN now() END, revoked_reason = CASE WHEN _revoked THEN left(_reason, 300) END WHERE id = _id;
  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_certificate_revoked(UUID, BOOLEAN, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_certificate_revoked(UUID, BOOLEAN, TEXT) TO authenticated;

-- 7. A refunded purchase revokes that learner's certificate for the course (unless another paid order covers it).
CREATE OR REPLACE FUNCTION public.on_order_refunded() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    UPDATE public.referral_commission_ledger l SET status = 'cancelled'
    FROM public.referral_attributions a
    WHERE a.id = l.attribution_id AND a.order_id = NEW.id AND l.status IN ('pending_clearance', 'approved') AND l.payout_id IS NULL;
    IF NOT EXISTS (SELECT 1 FROM public.orders x WHERE x.user_id = NEW.user_id AND x.course_id = NEW.course_id AND x.status = 'paid' AND x.id <> NEW.id) THEN
      UPDATE public.certificates SET revoked_at = now(), revoked_reason = 'Purchase refunded'
      WHERE user_id = NEW.user_id AND course_id = NEW.course_id AND revoked_at IS NULL;
    END IF;
  END IF;
  RETURN NEW;
END $$;
