-- Create atomic function to complete a payment transaction
-- This function atomically: validates state, cancels old subscription, creates new one, updates transaction
CREATE OR REPLACE FUNCTION public.complete_payment_transaction(
  p_transaction_id UUID,
  p_plan_id UUID,
  p_user_id UUID,
  p_referred_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_record RECORD;
  current_subscription_id UUID;
  new_subscription_id UUID;
  plan_duration_days INTEGER;
BEGIN
  -- Lock the transaction row to prevent concurrent modifications
  SELECT * INTO tx_record
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  -- Check if transaction exists
  IF tx_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;
  
  -- Idempotency: If already completed, return success with existing subscription_id
  IF tx_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', true,
      'already_completed', true,
      'subscription_id', tx_record.subscription_id
    );
  END IF;
  
  -- Validate transaction is in correct state
  IF tx_record.status NOT IN ('processing', 'pending') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not in valid state for completion: ' || tx_record.status
    );
  END IF;
  
  -- Validate user owns this transaction
  IF tx_record.user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User does not own this transaction'
    );
  END IF;
  
  -- Get plan duration
  SELECT duration_days INTO plan_duration_days
  FROM subscription_plans
  WHERE id = p_plan_id;
  
  IF plan_duration_days IS NULL THEN
    plan_duration_days := 30; -- Default to 30 days
  END IF;
  
  -- Cancel any existing active subscription for this user
  UPDATE subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active'
  RETURNING id INTO current_subscription_id;
  
  -- Create new subscription
  INSERT INTO subscriptions (
    user_id, plan_id, status, started_at, expires_at, 
    auto_renew, referred_by, created_at, updated_at
  ) VALUES (
    p_user_id, p_plan_id, 'active', now(), 
    now() + (plan_duration_days || ' days')::interval, 
    true, p_referred_by, now(), now()
  ) RETURNING id INTO new_subscription_id;
  
  -- Update transaction to completed with subscription_id
  UPDATE transactions
  SET 
    status = 'completed',
    subscription_id = new_subscription_id,
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'completed_at', now()::text,
      'previous_subscription_id', current_subscription_id::text
    )
  WHERE id = p_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'subscription_id', new_subscription_id,
    'cancelled_subscription_id', current_subscription_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;

-- Create atomic function to fail a payment transaction
CREATE OR REPLACE FUNCTION public.fail_payment_transaction(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT 'Payment failed'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_record RECORD;
BEGIN
  -- Lock the transaction row
  SELECT * INTO tx_record
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  -- Check if transaction exists
  IF tx_record IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not found'
    );
  END IF;
  
  -- Idempotency: If already failed, return success
  IF tx_record.status = 'failed' THEN
    RETURN json_build_object('success', true, 'already_failed', true);
  END IF;
  
  -- If already completed, don't mark as failed
  IF tx_record.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot fail completed transaction');
  END IF;
  
  -- Update to failed
  UPDATE transactions
  SET 
    status = 'failed',
    updated_at = now(),
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'failed_at', now()::text,
      'failure_reason', p_reason
    )
  WHERE id = p_transaction_id;
  
  RETURN json_build_object('success', true);
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;