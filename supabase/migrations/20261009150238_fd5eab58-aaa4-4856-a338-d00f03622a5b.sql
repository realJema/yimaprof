CREATE TABLE public.referral_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  school_rate numeric NOT NULL DEFAULT 20,
  affiliate_rate numeric NOT NULL DEFAULT 10,
  school_min_payout integer NOT NULL DEFAULT 500,
  affiliate_min_payout integer NOT NULL DEFAULT 500,
  tax_rate numeric NOT NULL DEFAULT 0,
  tax_applied boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);
GRANT SELECT ON public.referral_settings TO authenticated;
GRANT SELECT, UPDATE ON public.referral_settings TO authenticated;
GRANT ALL ON public.referral_settings TO service_role;
ALTER TABLE public.referral_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed-in read referral settings" ON public.referral_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update referral settings" ON public.referral_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
INSERT INTO public.referral_settings (id) VALUES (1) ON CONFLICT DO NOTHING;
CREATE TRIGGER update_referral_settings_updated_at BEFORE UPDATE ON public.referral_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.affiliate_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  method text NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.affiliate_payouts TO authenticated;
GRANT ALL ON public.affiliate_payouts TO service_role;
ALTER TABLE public.affiliate_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Affiliates view own payouts" ON public.affiliate_payouts FOR SELECT TO authenticated USING (auth.uid() = affiliate_id OR public.is_admin(auth.uid()));
CREATE POLICY "Admins update affiliate payouts" ON public.affiliate_payouts FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_affiliate_payouts_updated_at BEFORE UPDATE ON public.affiliate_payouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX IF NOT EXISTS establishment_commissions_transaction_uniq ON public.establishment_commissions(transaction_id) WHERE transaction_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.create_affiliate_commission_on_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_ref uuid; v_est uuid; v_student uuid; v_plan text; v_name text;
  v_school_rate numeric; v_aff_rate numeric;
BEGIN
  IF NEW.status <> 'completed' OR NEW.subscription_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'completed' THEN RETURN NEW; END IF;

  SELECT school_rate, affiliate_rate INTO v_school_rate, v_aff_rate FROM public.referral_settings WHERE id = 1;
  v_school_rate := COALESCE(v_school_rate, 20); v_aff_rate := COALESCE(v_aff_rate, 10);

  SELECT s.referred_by, p.name INTO v_ref, v_plan
  FROM public.subscriptions s LEFT JOIN public.subscription_plans p ON p.id = s.plan_id
  WHERE s.id = NEW.subscription_id;

  -- School: referrer owns an approved school, or payer is an active student of one.
  IF v_ref IS NOT NULL THEN
    SELECT id INTO v_est FROM public.establishments
    WHERE owner_id = v_ref AND approval_status = 'approved' AND is_active LIMIT 1;
  END IF;
  SELECT es.id, COALESCE(v_est, es.establishment_id) INTO v_student, v_est
  FROM public.establishment_students es JOIN public.establishments e ON e.id = es.establishment_id
  WHERE es.user_id = NEW.user_id AND es.status = 'active' AND e.approval_status = 'approved'
    AND (v_est IS NULL OR es.establishment_id = v_est)
  LIMIT 1;
  IF v_est IS NULL AND v_ref IS NOT NULL THEN
    SELECT id INTO v_est FROM public.establishments
    WHERE owner_id = v_ref AND approval_status = 'approved' AND is_active LIMIT 1;
  END IF;

  IF v_est IS NOT NULL THEN
    SELECT trim(coalesce(first_name,'') || ' ' || coalesce(last_name,'')) INTO v_name FROM public.profiles WHERE id = NEW.user_id;
    INSERT INTO public.establishment_commissions (establishment_id, student_id, subscription_id, transaction_id, referred_name, plan_name, amount, currency, status)
    VALUES (v_est, v_student, NEW.subscription_id, NEW.id, NULLIF(v_name,''), v_plan, FLOOR(NEW.amount * v_school_rate / 100), COALESCE(NEW.currency,'XAF'), 'available')
    ON CONFLICT DO NOTHING;
    RETURN NEW;
  END IF;

  -- Other referrers: approved affiliate, first payment of the referred user only.
  IF v_ref IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.affiliate_applications WHERE user_id = v_ref AND status = 'approved')
     AND NOT EXISTS (SELECT 1 FROM public.affiliate_earnings WHERE referred_user_id = NEW.user_id) THEN
    INSERT INTO public.affiliate_earnings (affiliate_id, referred_user_id, subscription_id, transaction_id, amount, status, currency)
    VALUES (v_ref, NEW.user_id, NEW.subscription_id, NEW.id, FLOOR(NEW.amount * v_aff_rate / 100), 'pending', NEW.currency)
    ON CONFLICT (subscription_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.affiliate_available_balance(p_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT sum(amount) FROM public.affiliate_earnings WHERE affiliate_id = p_user_id AND status = 'pending'),0)
    - COALESCE((SELECT sum(amount) FROM public.affiliate_payouts WHERE affiliate_id = p_user_id AND status IN ('pending','paid')),0))::integer
$$;
CREATE OR REPLACE FUNCTION public.establishment_available_balance(p_establishment_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT sum(amount) FROM public.establishment_commissions WHERE establishment_id = p_establishment_id AND status = 'available'),0)
    - COALESCE((SELECT sum(amount) FROM public.establishment_payouts WHERE establishment_id = p_establishment_id AND status IN ('pending','paid')),0))::integer
$$;
REVOKE EXECUTE ON FUNCTION public.affiliate_available_balance(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.establishment_available_balance(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.affiliate_available_balance(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.establishment_available_balance(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_revenue_ledger()
RETURNS TABLE(id uuid, revenue_type text, amount bigint, currency text, origin text, origin_detail text, occurred_at timestamptz, status text, reference text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_tax numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT tax_rate INTO v_tax FROM public.referral_settings WHERE id = 1;
  v_tax := COALESCE(v_tax, 0);
  RETURN QUERY
  SELECT t.id, 'yima'::text,
    (t.amount - COALESCE((SELECT sum(c.amount) FROM public.establishment_commissions c WHERE c.transaction_id = t.id),0)
              - COALESCE((SELECT sum(a.amount) FROM public.affiliate_earnings a WHERE a.transaction_id = t.id),0))::bigint,
    COALESCE(t.currency,'XAF'),
    COALESCE(NULLIF(trim(coalesce(p.first_name,'') || ' ' || coalesce(p.last_name,'')),''), p.email, 'Utilisateur'),
    p.email, t.created_at,
    CASE WHEN t.status = 'completed' THEN 'success' WHEN t.status IN ('failed','refunded') THEN 'failed' ELSE 'pending' END,
    t.provider_reference
  FROM public.transactions t LEFT JOIN public.profiles p ON p.id = t.user_id
  UNION ALL
  SELECT c.id, 'establishment'::text, c.amount::bigint, c.currency, e.name,
    COALESCE(c.referred_name, '') || CASE WHEN c.plan_name IS NOT NULL THEN ' · ' || c.plan_name ELSE '' END,
    c.created_at,
    CASE WHEN tt.status IS NULL OR tt.status = 'completed' THEN 'success' WHEN tt.status IN ('failed','refunded') THEN 'failed' ELSE 'pending' END,
    tt.provider_reference
  FROM public.establishment_commissions c JOIN public.establishments e ON e.id = c.establishment_id
  LEFT JOIN public.transactions tt ON tt.id = c.transaction_id
  UNION ALL
  SELECT po.id, 'tx'::text, FLOOR(po.amount * v_tax / 100)::bigint, po.currency, e.name, 'Retrait école ' || po.amount || ' ' || po.currency,
    po.requested_at,
    CASE WHEN po.status = 'paid' THEN 'success' WHEN po.status IN ('rejected','failed') THEN 'failed' ELSE 'pending' END, po.phone
  FROM public.establishment_payouts po JOIN public.establishments e ON e.id = po.establishment_id
  UNION ALL
  SELECT ap.id, 'tx'::text, FLOOR(ap.amount * v_tax / 100)::bigint, ap.currency,
    COALESCE(pr.username, pr.email, 'Parrain'), 'Retrait parrain ' || ap.amount || ' ' || ap.currency,
    ap.requested_at,
    CASE WHEN ap.status = 'paid' THEN 'success' WHEN ap.status IN ('rejected','failed') THEN 'failed' ELSE 'pending' END, ap.phone
  FROM public.affiliate_payouts ap LEFT JOIN public.profiles pr ON pr.id = ap.affiliate_id
  ORDER BY 7 DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_revenue_ledger() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revenue_ledger() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payouts()
RETURNS TABLE(id uuid, kind text, beneficiary text, amount integer, currency text, method text, phone text, status text, note text, requested_at timestamptz, processed_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  RETURN QUERY
  SELECT po.id, 'establishment'::text, e.name, po.amount, po.currency, po.method, po.phone, po.status, po.note, po.requested_at, po.processed_at
  FROM public.establishment_payouts po JOIN public.establishments e ON e.id = po.establishment_id
  UNION ALL
  SELECT ap.id, 'affiliate'::text, COALESCE(pr.username, pr.email, 'Parrain'), ap.amount, ap.currency, ap.method, ap.phone, ap.status, ap.note, ap.requested_at, ap.processed_at
  FROM public.affiliate_payouts ap LEFT JOIN public.profiles pr ON pr.id = ap.affiliate_id
  ORDER BY 10 DESC;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_list_payouts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payouts() TO authenticated;