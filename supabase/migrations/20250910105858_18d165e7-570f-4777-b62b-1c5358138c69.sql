-- Create a function to handle subscription plan transitions
CREATE OR REPLACE FUNCTION public.transition_subscription_plan(
  p_user_id UUID,
  p_new_plan_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_subscription_id UUID;
  new_subscription_id UUID;
  result JSON;
BEGIN
  -- Check if user has an active subscription
  SELECT id INTO current_subscription_id
  FROM public.subscriptions
  WHERE user_id = p_user_id AND status = 'active'
  LIMIT 1;

  -- If there's an active subscription, cancel it
  IF current_subscription_id IS NOT NULL THEN
    UPDATE public.subscriptions
    SET status = 'canceled',
        updated_at = now()
    WHERE id = current_subscription_id;
  END IF;

  -- Create new active subscription
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    expires_at,
    auto_renew,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_new_plan_id,
    'active',
    now(),
    now() + interval '30 days', -- Default to 30 days, adjust as needed
    true,
    now(),
    now()
  ) RETURNING id INTO new_subscription_id;

  -- Return result
  result := json_build_object(
    'success', true,
    'cancelled_subscription_id', current_subscription_id,
    'new_subscription_id', new_subscription_id,
    'message', 'Subscription plan updated successfully'
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.transition_subscription_plan(UUID, UUID) TO authenticated;