CREATE OR REPLACE FUNCTION public.finalize_payment_transaction(p_transaction_id uuid, p_extra jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_plan_id uuid;
  v_referred_by uuid;
  v_billing_cycle text;
  v_base_days integer;
  v_duration_days integer;
  v_expires_at timestamptz;
  v_sub_id uuid;
BEGIN
  -- Lock the transaction row: serializes concurrent finalizations (webhook vs polling)
  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Transaction not found');
  END IF;

  -- Idempotency: already finalized
  IF v_tx.status = 'completed' THEN
    RETURN jsonb_build_object('ok', true, 'subscription_id', v_tx.subscription_id, 'already_done', true);
  END IF;

  v_plan_id := NULLIF(v_tx.metadata->>'plan_id', '')::uuid;
  IF v_plan_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Missing plan_id in transaction metadata');
  END IF;

  v_referred_by := NULLIF(v_tx.metadata->>'referred_by', '')::uuid;
  v_billing_cycle := v_tx.metadata->>'billing_cycle';

  SELECT duration_days INTO v_base_days FROM public.subscription_plans WHERE id = v_plan_id;
  v_base_days := COALESCE(v_base_days, 30);

  v_duration_days := CASE
    WHEN v_billing_cycle = 'trimester' THEN v_base_days * 3
    WHEN v_billing_cycle = 'annual' THEN v_base_days * 9
    ELSE v_base_days
  END;
  v_expires_at := now() + make_interval(days => v_duration_days);

  -- 1. Cancel any existing active subscription for this user
  UPDATE public.subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = v_tx.user_id AND status = 'active';

  -- 2. Create the new active subscription
  INSERT INTO public.subscriptions (user_id, plan_id, status, started_at, expires_at, auto_renew, referred_by)
  VALUES (v_tx.user_id, v_plan_id, 'active', now(), v_expires_at, true, v_referred_by)
  RETURNING id INTO v_sub_id;

  -- 3. Mark the transaction completed and link the subscription
  UPDATE public.transactions
  SET status = 'completed',
      subscription_id = v_sub_id,
      metadata = v_tx.metadata || COALESCE(p_extra, '{}'::jsonb) || jsonb_build_object('completed_at', now())
  WHERE id = v_tx.id;

  RETURN jsonb_build_object('ok', true, 'subscription_id', v_sub_id);
END;
$$;

REVOKE ALL ON FUNCTION public.finalize_payment_transaction(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_payment_transaction(uuid, jsonb) TO service_role;