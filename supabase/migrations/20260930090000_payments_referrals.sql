-- =====================================================================
-- Payments (Paypur UPI) + Referrals
-- Additive. Safe on a fresh master_schema.sql database or an upgraded one.
--
-- Trust model:
--   * Only the server (service_role) can create orders, read gateway secrets,
--     and finalize a paid order. Students/anon/admin-via-API cannot.
--   * Enrollment from payment happens ONLY inside finalize_paid_order(), which the
--     server calls after verifying the gateway signature.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ORDERS — lock down client inserts, add gateway fields
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "orders insert" ON public.orders;
REVOKE INSERT, UPDATE, DELETE ON public.orders FROM anon, authenticated;
REVOKE ALL ON public.orders FROM anon;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'paypur',
  ADD COLUMN IF NOT EXISTS provider_order_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_txn_id TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS list_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS test_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_code_id UUID,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_order_uidx ON public.orders (provider_order_id) WHERE provider_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS orders_user_idx ON public.orders (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON public.orders (status, created_at DESC);
DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_status_check CHECK (status IN ('created','pending','paid','failed','refunded')) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DROP TRIGGER IF EXISTS orders_updated ON public.orders;
CREATE TRIGGER orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------------------------------------------------------------------
-- 2. PAYMENT SETTINGS (singleton). Secrets are AES-GCM encrypted by the app.
--    NO client role can read this table — only service_role (server).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
  gateway_key_enc TEXT,
  gateway_salt_enc TEXT,
  gateway_key_hint TEXT,                          -- last 4 chars, for display only
  enabled BOOLEAN NOT NULL DEFAULT false,
  test_mode BOOLEAN NOT NULL DEFAULT true,        -- true: every paid course is charged test_amount
  test_amount NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (test_amount >= 1),
  referral_enabled BOOLEAN NOT NULL DEFAULT true,
  referral_commission_percent NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (referral_commission_percent BETWEEN 0 AND 100),
  referral_clearance_days INTEGER NOT NULL DEFAULT 14 CHECK (referral_clearance_days BETWEEN 0 AND 90),
  referral_min_payout NUMERIC(10,2) NOT NULL DEFAULT 500 CHECK (referral_min_payout >= 0),
  updated_by UUID REFERENCES auth.users ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO public.payment_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
ALTER TABLE public.payment_settings ENABLE ROW LEVEL SECURITY;   -- no policies = no client access
REVOKE ALL ON public.payment_settings FROM anon, authenticated;
GRANT ALL ON public.payment_settings TO service_role;

-- ---------------------------------------------------------------------
-- 3. REFERRALS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.referral_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,20}$'),
  commission_percent NUMERIC(5,2) CHECK (commission_percent IS NULL OR commission_percent BETWEEN 0 AND 100),  -- NULL = global default
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
DROP POLICY IF EXISTS "own referral code" ON public.referral_codes;
CREATE POLICY "own referral code" ON public.referral_codes FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.referral_codes FROM anon;

DO $$ BEGIN
  ALTER TABLE public.orders ADD CONSTRAINT orders_referral_fk FOREIGN KEY (referral_code_id) REFERENCES public.referral_codes(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.referral_attributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code_id UUID NOT NULL REFERENCES public.referral_codes(id),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users,
  referee_user_id UUID NOT NULL REFERENCES auth.users,
  net_paid_amount NUMERIC(10,2) NOT NULL,
  commission_percent NUMERIC(5,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT cannot_refer_self CHECK (referrer_user_id <> referee_user_id)
);
CREATE INDEX IF NOT EXISTS referral_attr_referrer_idx ON public.referral_attributions (referrer_user_id);
ALTER TABLE public.referral_attributions ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_attributions TO authenticated;
GRANT ALL ON public.referral_attributions TO service_role;
DROP POLICY IF EXISTS "referrer reads own attributions" ON public.referral_attributions;
CREATE POLICY "referrer reads own attributions" ON public.referral_attributions FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.referral_attributions FROM anon;

CREATE TABLE IF NOT EXISTS public.referral_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL REFERENCES auth.users,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('upi','bank')),
  payout_identifier TEXT NOT NULL,
  transaction_reference TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','completed','rejected')),
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_payouts_referrer_idx ON public.referral_payouts (referrer_user_id, created_at DESC);
ALTER TABLE public.referral_payouts ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_payouts TO authenticated;
GRANT ALL ON public.referral_payouts TO service_role;
DROP POLICY IF EXISTS "referrer reads own payouts" ON public.referral_payouts;
CREATE POLICY "referrer reads own payouts" ON public.referral_payouts FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.referral_payouts FROM anon;

CREATE TABLE IF NOT EXISTS public.referral_commission_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribution_id UUID NOT NULL UNIQUE REFERENCES public.referral_attributions ON DELETE CASCADE,
  referrer_user_id UUID NOT NULL REFERENCES auth.users,
  commission_amount NUMERIC(10,2) NOT NULL CHECK (commission_amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending_clearance' CHECK (status IN ('pending_clearance','approved','paid_out','cancelled')),
  clearance_due_at TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  payout_id UUID REFERENCES public.referral_payouts,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_ledger_referrer_idx ON public.referral_commission_ledger (referrer_user_id, status);
ALTER TABLE public.referral_commission_ledger ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.referral_commission_ledger TO authenticated;
GRANT ALL ON public.referral_commission_ledger TO service_role;
DROP POLICY IF EXISTS "referrer reads own ledger" ON public.referral_commission_ledger;
CREATE POLICY "referrer reads own ledger" ON public.referral_commission_ledger FOR SELECT TO authenticated
  USING (referrer_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
REVOKE ALL ON public.referral_commission_ledger FROM anon;
-- No INSERT/UPDATE/DELETE policies: the ledger changes only through the functions below.

-- Referrals for a user: a stable, non-guessable-by-ID public code (never the raw UUID).
CREATE OR REPLACE FUNCTION public.get_or_create_referral_code() RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing TEXT; base TEXT; candidate TEXT; nm TEXT; tries INT := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT code INTO existing FROM public.referral_codes WHERE user_id = auth.uid();
  IF existing IS NOT NULL THEN RETURN existing; END IF;
  SELECT full_name INTO nm FROM public.profiles WHERE id = auth.uid();
  base := upper(regexp_replace(COALESCE(split_part(nm, ' ', 1), ''), '[^A-Za-z]', '', 'g'));
  base := left(NULLIF(base, ''), 6);
  base := COALESCE(base, 'GC');
  LOOP
    candidate := base || upper(substr(md5(random()::text || clock_timestamp()::text || auth.uid()::text), 1, 4));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (auth.uid(), candidate);
      RETURN candidate;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO existing FROM public.referral_codes WHERE user_id = auth.uid();
      IF existing IS NOT NULL THEN RETURN existing; END IF;
      tries := tries + 1;
      IF tries > 10 THEN RAISE EXCEPTION 'could_not_generate_code'; END IF;
    END;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_referral_code() TO authenticated;

-- Move commissions whose clearance window has passed to 'approved' (idempotent; called lazily).
CREATE OR REPLACE FUNCTION public.refresh_commissions() RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n INT;
BEGIN
  UPDATE public.referral_commission_ledger l SET status = 'approved', approved_at = now()
  WHERE l.status = 'pending_clearance' AND l.clearance_due_at <= now()
    AND EXISTS (SELECT 1 FROM public.referral_attributions a JOIN public.orders o ON o.id = a.order_id WHERE a.id = l.attribution_id AND o.status = 'paid');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END $$;
REVOKE ALL ON FUNCTION public.refresh_commissions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_commissions() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.request_referral_payout(_method TEXT, _identifier TEXT) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total NUMERIC; minp NUMERIC; pid UUID; ident TEXT := trim(_identifier);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF _method NOT IN ('upi','bank') THEN RAISE EXCEPTION 'invalid_method'; END IF;
  IF _method = 'upi' AND ident !~ '^[A-Za-z0-9._-]{2,64}@[A-Za-z0-9]{2,32}$' THEN RAISE EXCEPTION 'invalid_upi_id'; END IF;
  IF _method = 'bank' AND length(ident) NOT BETWEEN 8 AND 200 THEN RAISE EXCEPTION 'invalid_bank_details'; END IF;
  PERFORM public.refresh_commissions();
  SELECT referral_min_payout INTO minp FROM public.payment_settings WHERE id;
  SELECT COALESCE(sum(commission_amount), 0) INTO total FROM public.referral_commission_ledger
    WHERE referrer_user_id = auth.uid() AND status = 'approved' AND payout_id IS NULL;
  IF total <= 0 OR total < minp THEN RAISE EXCEPTION 'below_minimum_payout'; END IF;
  INSERT INTO public.referral_payouts (referrer_user_id, amount, payment_method, payout_identifier)
    VALUES (auth.uid(), total, _method, ident) RETURNING id INTO pid;
  UPDATE public.referral_commission_ledger SET payout_id = pid
    WHERE referrer_user_id = auth.uid() AND status = 'approved' AND payout_id IS NULL;
  RETURN pid;
END $$;
REVOKE ALL ON FUNCTION public.request_referral_payout(TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_referral_payout(TEXT, TEXT) TO authenticated;

-- Admin: complete or reject a payout request.
CREATE OR REPLACE FUNCTION public.admin_process_payout(_payout_id UUID, _action TEXT, _reference TEXT DEFAULT NULL, _note TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.referral_payouts%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO p FROM public.referral_payouts WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'requested' THEN RAISE EXCEPTION 'payout_not_open'; END IF;
  IF _action = 'complete' THEN
    IF COALESCE(trim(_reference), '') = '' THEN RAISE EXCEPTION 'reference_required'; END IF;
    UPDATE public.referral_payouts SET status = 'completed', transaction_reference = trim(_reference), admin_note = _note, processed_by = auth.uid(), processed_at = now() WHERE id = _payout_id;
    UPDATE public.referral_commission_ledger SET status = 'paid_out' WHERE payout_id = _payout_id AND status = 'approved';
  ELSIF _action = 'reject' THEN
    UPDATE public.referral_payouts SET status = 'rejected', admin_note = _note, processed_by = auth.uid(), processed_at = now() WHERE id = _payout_id;
    UPDATE public.referral_commission_ledger SET payout_id = NULL WHERE payout_id = _payout_id;
  ELSE RAISE EXCEPTION 'invalid_action'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_process_payout(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_process_payout(UUID, TEXT, TEXT, TEXT) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. finalize_paid_order — the ONLY place payment turns into access.
--    service_role only. Idempotent. Checks the paid amount against the order.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_paid_order(_provider_order_id TEXT, _txn_id TEXT, _paid_amount NUMERIC, _verified_by TEXT DEFAULT 'signature') RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE; c RECORD; s RECORD; rc RECORD; expires TIMESTAMPTZ; pct NUMERIC; att UUID;
BEGIN
  SELECT * INTO o FROM public.orders WHERE provider_order_id = _provider_order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'order_not_found'); END IF;
  IF o.status = 'paid' THEN RETURN jsonb_build_object('status', 'paid', 'already', true, 'order_id', o.id, 'course_id', o.course_id); END IF;
  IF o.status = 'refunded' THEN RETURN jsonb_build_object('status', 'refunded', 'order_id', o.id); END IF;
  IF round(_paid_amount, 2) <> round(o.amount, 2) THEN
    UPDATE public.orders SET status = 'failed', failure_reason = 'amount_mismatch', provider_txn_id = COALESCE(_txn_id, provider_txn_id) WHERE id = o.id;
    RETURN jsonb_build_object('status', 'amount_mismatch', 'order_id', o.id);
  END IF;
  UPDATE public.orders SET status = 'paid', paid_at = now(), provider_txn_id = COALESCE(_txn_id, provider_txn_id), verified_by = _verified_by, failure_reason = NULL WHERE id = o.id;

  SELECT access_policy, access_days INTO c FROM public.courses WHERE id = o.course_id;
  expires := CASE WHEN c.access_policy = 'days' AND c.access_days IS NOT NULL THEN now() + make_interval(days => c.access_days) END;
  INSERT INTO public.enrollments (user_id, course_id, source, expires_at, notes)
    VALUES (o.user_id, o.course_id, 'payment', expires, 'Order ' || o.id)
    ON CONFLICT (user_id, course_id) DO UPDATE SET source = 'payment', expires_at = EXCLUDED.expires_at, notes = EXCLUDED.notes;

  IF o.referral_code_id IS NOT NULL THEN
    SELECT * INTO s FROM public.payment_settings WHERE id;
    SELECT * INTO rc FROM public.referral_codes WHERE id = o.referral_code_id AND is_active;
    IF FOUND AND s.referral_enabled AND rc.user_id <> o.user_id THEN
      pct := COALESCE(rc.commission_percent, s.referral_commission_percent);
      INSERT INTO public.referral_attributions (referral_code_id, order_id, referrer_user_id, referee_user_id, net_paid_amount, commission_percent)
        VALUES (rc.id, o.id, rc.user_id, o.user_id, o.amount, pct) ON CONFLICT (order_id) DO NOTHING RETURNING id INTO att;
      IF att IS NOT NULL THEN
        INSERT INTO public.referral_commission_ledger (attribution_id, referrer_user_id, commission_amount, clearance_due_at)
          VALUES (att, rc.user_id, round(o.amount * pct / 100, 2), now() + make_interval(days => s.referral_clearance_days));
      END IF;
    END IF;
  END IF;
  RETURN jsonb_build_object('status', 'paid', 'order_id', o.id, 'course_id', o.course_id);
END $$;
REVOKE ALL ON FUNCTION public.finalize_paid_order(TEXT, TEXT, NUMERIC, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_paid_order(TEXT, TEXT, NUMERIC, TEXT) TO service_role;

-- Failed/cancelled payments (server only).
CREATE OR REPLACE FUNCTION public.fail_order(_provider_order_id TEXT, _txn_id TEXT, _reason TEXT) RETURNS VOID
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.orders SET status = 'failed', provider_txn_id = COALESCE(_txn_id, provider_txn_id), failure_reason = left(_reason, 200)
  WHERE provider_order_id = _provider_order_id AND status IN ('created', 'pending', 'failed');
$$;
REVOKE ALL ON FUNCTION public.fail_order(TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_order(TEXT, TEXT, TEXT) TO service_role;

-- Admin: record a refund (money is returned outside this app). Revokes access and cancels unpaid commission.
CREATE OR REPLACE FUNCTION public.admin_mark_order_refunded(_order_id UUID, _note TEXT DEFAULT NULL) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'not_admin'; END IF;
  SELECT * INTO o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND OR o.status <> 'paid' THEN RAISE EXCEPTION 'order_not_refundable'; END IF;
  UPDATE public.orders SET status = 'refunded', refund_status = 'refunded', failure_reason = left(_note, 200) WHERE id = o.id;
  DELETE FROM public.enrollments e WHERE e.user_id = o.user_id AND e.course_id = o.course_id AND e.source = 'payment'
    AND NOT EXISTS (SELECT 1 FROM public.orders x WHERE x.user_id = o.user_id AND x.course_id = o.course_id AND x.status = 'paid' AND x.id <> o.id);
END $$;
REVOKE ALL ON FUNCTION public.admin_mark_order_refunded(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_order_refunded(UUID, TEXT) TO authenticated;

-- Refund → cancel commissions that haven't been paid out.
CREATE OR REPLACE FUNCTION public.on_order_refunded() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'refunded' AND OLD.status IS DISTINCT FROM 'refunded' THEN
    UPDATE public.referral_commission_ledger l SET status = 'cancelled'
    FROM public.referral_attributions a
    WHERE a.id = l.attribution_id AND a.order_id = NEW.id AND l.status IN ('pending_clearance', 'approved') AND l.payout_id IS NULL;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS orders_refund_commission ON public.orders;
CREATE TRIGGER orders_refund_commission AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION public.on_order_refunded();

-- Admin list helper: aggregate referral numbers without shipping every row.
CREATE OR REPLACE VIEW public.admin_referral_totals WITH (security_invoker = true) AS
SELECT referrer_user_id,
       COUNT(*) AS commissions,
       COALESCE(SUM(commission_amount) FILTER (WHERE status IN ('pending_clearance','approved','paid_out')), 0) AS earned,
       COALESCE(SUM(commission_amount) FILTER (WHERE status = 'paid_out'), 0) AS paid_out,
       COALESCE(SUM(commission_amount) FILTER (WHERE status = 'approved' AND payout_id IS NULL), 0) AS available
FROM public.referral_commission_ledger GROUP BY referrer_user_id;
GRANT SELECT ON public.admin_referral_totals TO authenticated;

-- Admins can manage referral codes (create custom codes, deactivate).
DROP POLICY IF EXISTS "admins manage referral codes" ON public.referral_codes;
CREATE POLICY "admins manage referral codes" ON public.referral_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
GRANT INSERT, UPDATE ON public.referral_codes TO authenticated;
