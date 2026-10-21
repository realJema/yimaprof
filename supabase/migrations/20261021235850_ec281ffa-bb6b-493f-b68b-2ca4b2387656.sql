CREATE TABLE public.payout_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), payout_id uuid NOT NULL, kind text NOT NULL CHECK (kind IN ('affiliate','establishment')),
 state text NOT NULL DEFAULT 'sending' CHECK (state IN ('sending','unknown','paid','failed')),
 amount integer NOT NULL, currency text NOT NULL, method text NOT NULL, phone text NOT NULL,
 provider_reference text, provider_status text, error_code text, approved_by uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(kind,payout_id)
);
GRANT SELECT ON public.payout_transfers TO authenticated;
GRANT ALL ON public.payout_transfers TO service_role;
ALTER TABLE public.payout_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payout transfers" ON public.payout_transfers FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=auth.uid() AND role='admin'::public.app_role));
CREATE TRIGGER payout_transfers_updated BEFORE UPDATE ON public.payout_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE FUNCTION public.guard_payout_transfer() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_transfer public.payout_transfers%ROWTYPE; v_kind text;
BEGIN
 v_kind := CASE WHEN TG_TABLE_NAME='affiliate_payouts' THEN 'affiliate' ELSE 'establishment' END;
 SELECT * INTO v_transfer FROM public.payout_transfers WHERE kind=v_kind AND payout_id=OLD.id;
 IF v_transfer.id IS NOT NULL AND (NEW.amount,NEW.currency,NEW.method,NEW.phone) IS DISTINCT FROM (OLD.amount,OLD.currency,OLD.method,OLD.phone) THEN RAISE EXCEPTION 'Transfer destination is immutable'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Payout is already closed'; END IF;
  IF NEW.status='rejected' AND v_transfer.id IS NULL THEN RETURN NEW; END IF;
  IF auth.role()='service_role' AND ((NEW.status='paid' AND v_transfer.state='paid' AND v_transfer.provider_status='SUCCESS' AND v_transfer.provider_reference IS NOT NULL) OR (NEW.status='failed' AND v_transfer.state='failed' AND v_transfer.provider_status='FAILED')) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Payout requires confirmed provider outcome';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER affiliate_transfer_guard BEFORE UPDATE ON public.affiliate_payouts FOR EACH ROW EXECUTE FUNCTION public.guard_payout_transfer();
CREATE TRIGGER establishment_transfer_guard BEFORE UPDATE ON public.establishment_payouts FOR EACH ROW EXECUTE FUNCTION public.guard_payout_transfer();
CREATE OR REPLACE FUNCTION public.claim_payout_transfer(p_kind text,p_id uuid,p_actor uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_row jsonb; v_transfer public.payout_transfers%ROWTYPE;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=p_actor AND role='admin'::public.app_role) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_kind='affiliate' THEN SELECT to_jsonb(p) INTO v_row FROM public.affiliate_payouts p WHERE id=p_id FOR UPDATE;
 ELSIF p_kind='establishment' THEN SELECT to_jsonb(p) INTO v_row FROM public.establishment_payouts p WHERE id=p_id FOR UPDATE;
 ELSE RAISE EXCEPTION 'Invalid kind'; END IF;
 IF v_row IS NULL THEN RAISE EXCEPTION 'Payout not found'; END IF;
 SELECT * INTO v_transfer FROM public.payout_transfers WHERE kind=p_kind AND payout_id=p_id;
 IF FOUND THEN RETURN jsonb_build_object('claimed',false,'transfer',to_jsonb(v_transfer)); END IF;
 IF v_row->>'status'<>'pending' THEN RAISE EXCEPTION 'Payout is not pending'; END IF;
 IF (v_row->>'amount')::integer<=0 OR v_row->>'currency'<>'XAF' OR v_row->>'method' NOT IN ('mtn_momo','orange_money') OR NOT (v_row->>'phone' ~ '^\+?(237)?6[0-9]{8}$') THEN RAISE EXCEPTION 'Invalid payout destination or amount'; END IF;
 INSERT INTO public.payout_transfers(payout_id,kind,amount,currency,method,phone,approved_by) VALUES(p_id,p_kind,(v_row->>'amount')::integer,v_row->>'currency',v_row->>'method',v_row->>'phone',p_actor) RETURNING * INTO v_transfer;
 INSERT INTO public.audit_logs(actor_id,action,target_type,target_id,metadata) VALUES(p_actor,'payout_transfer_started',p_kind||'_payouts',p_id,jsonb_build_object('transfer_id',v_transfer.id,'amount',v_transfer.amount));
 RETURN jsonb_build_object('claimed',true,'transfer',to_jsonb(v_transfer));
END $$;
REVOKE ALL ON FUNCTION public.claim_payout_transfer(text,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_payout_transfer(text,uuid,uuid) TO service_role;
CREATE OR REPLACE FUNCTION public.finish_payout_transfer(p_transfer uuid,p_state text,p_reference text DEFAULT NULL,p_status text DEFAULT NULL,p_error text DEFAULT NULL) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_t public.payout_transfers%ROWTYPE; v_status text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 SELECT * INTO v_t FROM public.payout_transfers WHERE id=p_transfer FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
 IF v_t.state IN ('paid','failed') THEN RETURN v_t.state; END IF;
 IF p_state NOT IN ('unknown','paid','failed') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
 IF p_state='paid' AND (p_status IS DISTINCT FROM 'SUCCESS' OR NULLIF(p_reference,'') IS NULL) THEN RAISE EXCEPTION 'Missing success evidence'; END IF;
 IF p_state='failed' AND p_status IS DISTINCT FROM 'FAILED' THEN RAISE EXCEPTION 'Missing failure evidence'; END IF;
 UPDATE public.payout_transfers SET state=p_state,provider_reference=COALESCE(NULLIF(p_reference,''),provider_reference),provider_status=p_status,error_code=p_error WHERE id=p_transfer;
 IF p_state IN ('paid','failed') THEN
  v_status:=p_state;
  IF v_t.kind='affiliate' THEN UPDATE public.affiliate_payouts SET status=v_status,processed_at=now(),processed_by=v_t.approved_by WHERE id=v_t.payout_id AND status='pending';
  ELSE UPDATE public.establishment_payouts SET status=v_status,processed_at=now() WHERE id=v_t.payout_id AND status='pending'; END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout state conflict'; END IF;
 END IF;
 INSERT INTO public.audit_logs(actor_id,action,target_type,target_id,metadata) VALUES(v_t.approved_by,'payout_transfer_'||p_state,v_t.kind||'_payouts',v_t.payout_id,jsonb_build_object('transfer_id',v_t.id,'provider_reference',p_reference,'provider_status',p_status,'error_code',p_error));
 RETURN p_state;
END $$;
REVOKE ALL ON FUNCTION public.finish_payout_transfer(uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_payout_transfer(uuid,text,text,text,text) TO service_role;