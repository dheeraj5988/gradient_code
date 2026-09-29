-- Email verification is enforced in the database for actions that must not be available to unverified accounts.
-- Google sign-ins are already verified. Existing password users who confirmed by link keep their email_confirmed_at.

CREATE OR REPLACE FUNCTION public.email_is_verified() RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT COALESCE((SELECT u.email_confirmed_at IS NOT NULL FROM auth.users u WHERE u.id = auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.email_is_verified() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.email_is_verified() TO authenticated;

-- Certificates: claiming requires a verified email (same function as before + one check).
CREATE OR REPLACE FUNCTION public.issue_certificate(_course_id UUID, _holder_name TEXT) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid UUID := auth.uid(); el JSONB; nm TEXT := btrim(regexp_replace(COALESCE(_holder_name, ''), '\s+', ' ', 'g'));
  existing TEXT; pol_code TEXT; ctitle TEXT; num TEXT; tries INT := 0; alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; tok TEXT; i INT;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.email_is_verified() THEN RAISE EXCEPTION 'email_not_verified'; END IF;
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
