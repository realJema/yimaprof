CREATE OR REPLACE FUNCTION public.guard_payout_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE v_transfer public.payout_transfers%ROWTYPE; v_kind text;
BEGIN
 v_kind := CASE WHEN TG_TABLE_NAME='affiliate_payouts' THEN 'affiliate' ELSE 'establishment' END;
 SELECT * INTO v_transfer FROM public.payout_transfers WHERE kind=v_kind AND payout_id=OLD.id;
 IF v_transfer.id IS NOT NULL AND (NEW.amount,NEW.currency,NEW.method,NEW.phone) IS DISTINCT FROM (OLD.amount,OLD.currency,OLD.method,OLD.phone) THEN RAISE EXCEPTION 'Transfer destination is immutable'; END IF;
 IF NEW.status IS DISTINCT FROM OLD.status THEN
  IF OLD.status <> 'pending' THEN RAISE EXCEPTION 'Payout is already closed'; END IF;
  IF NEW.status='rejected' AND v_transfer.id IS NULL THEN RETURN NEW; END IF;
  IF auth.role()='service_role' AND NEW.status='rejected' AND v_transfer.state='voided' THEN RETURN NEW; END IF;
  IF auth.role()='service_role' AND ((NEW.status='paid' AND v_transfer.state='paid' AND v_transfer.provider_status='SUCCESS' AND v_transfer.provider_reference IS NOT NULL) OR (NEW.status='failed' AND v_transfer.state='failed' AND v_transfer.provider_status='FAILED')) THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Payout requires confirmed provider outcome';
 END IF;
 RETURN NEW;
END $function$;