ALTER TABLE public.payout_transfers DROP CONSTRAINT payout_transfers_state_check;
ALTER TABLE public.payout_transfers ADD CONSTRAINT payout_transfers_state_check CHECK (state = ANY (ARRAY['sending'::text, 'unknown'::text, 'paid'::text, 'failed'::text, 'voided'::text]));

CREATE OR REPLACE FUNCTION public.void_payout_transfer(p_transfer uuid, p_actor uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_t public.payout_transfers%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' OR NOT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = p_actor AND role = 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  SELECT * INTO v_t FROM public.payout_transfers WHERE id = p_transfer FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF v_t.state IN ('paid', 'failed') THEN RETURN v_t.state; END IF;
  UPDATE public.payout_transfers SET state = 'voided', error_code = 'VOIDED_BY_ADMIN' WHERE id = p_transfer;
  IF v_t.kind = 'affiliate' THEN
    UPDATE public.affiliate_payouts SET status = 'rejected', processed_at = now(), processed_by = p_actor WHERE id = v_t.payout_id AND status = 'pending';
  ELSE
    UPDATE public.establishment_payouts SET status = 'rejected', processed_at = now() WHERE id = v_t.payout_id AND status = 'pending';
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payout state conflict'; END IF;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
  VALUES (p_actor, 'payout_transfer_voided', v_t.kind || '_payouts', v_t.payout_id,
          jsonb_build_object('transfer_id', v_t.id, 'amount', v_t.amount, 'phone', v_t.phone));
  RETURN 'voided';
END
$function$;

REVOKE ALL ON FUNCTION public.void_payout_transfer(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_payout_transfer(uuid, uuid) TO service_role;