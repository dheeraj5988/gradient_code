-- Compensating migration (the historical 20260930130000 file is intentionally left untouched).
-- Testing phase: no email-verification requirement anywhere. Restores issue_certificate to its
-- pre-verification behaviour (all other checks — auth, eligibility, unique number — are unchanged)
-- and removes the now-unused email_is_verified() helper.

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

DROP FUNCTION IF EXISTS public.email_is_verified();
