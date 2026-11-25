CREATE OR REPLACE FUNCTION public.process_mesomb_webhook_event(
  p_event_id text,
  p_event_type text,
  p_transaction_id uuid,
  p_action text,
  p_payload jsonb,
  p_provider_reference text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_claimed_event_id text;
  v_existing_status text;
  v_tx public.transactions%ROWTYPE;
  v_result jsonb;
BEGIN
  IF p_event_id IS NULL OR btrim(p_event_id) = '' THEN
    RAISE EXCEPTION 'Missing webhook event ID';
  END IF;
  IF p_action NOT IN ('success', 'failed', 'ignored') THEN
    RAISE EXCEPTION 'Unsupported webhook action';
  END IF;

  INSERT INTO public.mesomb_webhook_events (
    event_id, event_type, transaction_id, action, payload
  ) VALUES (
    p_event_id, COALESCE(NULLIF(p_event_type, ''), 'unknown'), p_transaction_id, p_action, COALESCE(p_payload, '{}'::jsonb)
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING event_id INTO v_claimed_event_id;

  IF v_claimed_event_id IS NULL THEN
    SELECT status INTO v_existing_status
    FROM public.mesomb_webhook_events
    WHERE event_id = p_event_id
    FOR UPDATE;

    IF v_existing_status = 'processed' THEN
      RETURN jsonb_build_object('ok', true, 'duplicate', true);
    END IF;

    UPDATE public.mesomb_webhook_events
    SET event_type = COALESCE(NULLIF(p_event_type, ''), 'unknown'),
        transaction_id = p_transaction_id,
        action = p_action,
        status = 'processing',
        payload = COALESCE(p_payload, '{}'::jsonb),
        error = NULL,
        received_at = now(),
        processed_at = NULL
    WHERE event_id = p_event_id;
  END IF;

  IF p_action = 'ignored' THEN
    UPDATE public.mesomb_webhook_events
    SET status = 'processed', processed_at = now()
    WHERE event_id = p_event_id;
    RETURN jsonb_build_object('ok', true, 'duplicate', false, 'ignored', true);
  END IF;

  IF p_transaction_id IS NULL THEN
    UPDATE public.mesomb_webhook_events
    SET status = 'failed', error = 'Missing transaction ID', processed_at = now()
    WHERE event_id = p_event_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Missing transaction ID');
  END IF;

  SELECT * INTO v_tx FROM public.transactions WHERE id = p_transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    UPDATE public.mesomb_webhook_events
    SET status = 'failed', error = 'Transaction not found', processed_at = now()
    WHERE event_id = p_event_id;
    RETURN jsonb_build_object('ok', false, 'error', 'Transaction not found');
  END IF;

  IF v_tx.status IN ('completed', 'failed') THEN
    UPDATE public.mesomb_webhook_events
    SET status = 'processed', processed_at = now()
    WHERE event_id = p_event_id;
    RETURN jsonb_build_object(
      'ok', true,
      'duplicate', false,
      'already_done', true,
      'subscription_id', v_tx.subscription_id,
      'transaction_status', v_tx.status
    );
  END IF;

  IF p_action = 'success' THEN
    IF p_provider_reference IS NOT NULL AND btrim(p_provider_reference) <> '' AND v_tx.provider_reference IS NULL THEN
      UPDATE public.transactions SET provider_reference = p_provider_reference WHERE id = v_tx.id;
    END IF;

    SELECT public.finalize_payment_transaction(
      v_tx.id,
      jsonb_build_object(
        'mesomb_webhook', COALESCE(p_payload, '{}'::jsonb),
        'confirmed_by', 'webhook',
        'mesomb_webhook_event_id', p_event_id
      )
    ) INTO v_result;

    IF COALESCE((v_result->>'ok')::boolean, false) THEN
      UPDATE public.mesomb_webhook_events
      SET status = 'processed', processed_at = now()
      WHERE event_id = p_event_id;
      RETURN v_result || jsonb_build_object('duplicate', false);
    END IF;

    UPDATE public.mesomb_webhook_events
    SET status = 'failed', error = COALESCE(v_result->>'error', 'Failed to finalize transaction'), processed_at = now()
    WHERE event_id = p_event_id;
    RETURN v_result;
  END IF;

  UPDATE public.transactions
  SET status = 'failed',
      metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
        'mesomb_webhook', COALESCE(p_payload, '{}'::jsonb),
        'confirmed_by', 'webhook',
        'mesomb_webhook_event_id', p_event_id,
        'failure_reason', COALESCE(p_failure_reason, 'MeSomb payment failed'),
        'failed_at', now()
      )
  WHERE id = v_tx.id AND status NOT IN ('completed', 'failed');

  UPDATE public.mesomb_webhook_events
  SET status = 'processed', processed_at = now()
  WHERE event_id = p_event_id;
  RETURN jsonb_build_object('ok', true, 'duplicate', false, 'transaction_status', 'failed');
END;
$$;

REVOKE ALL ON FUNCTION public.process_mesomb_webhook_event(text, text, uuid, text, jsonb, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_mesomb_webhook_event(text, text, uuid, text, jsonb, text, text) TO service_role;