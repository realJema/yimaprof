-- Update transition_subscription_plan function to accept referred_by parameter
CREATE OR REPLACE FUNCTION public.transition_subscription_plan(
  p_user_id uuid, 
  p_new_plan_id uuid,
  p_referred_by uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Create new active subscription with referred_by
  INSERT INTO public.subscriptions (
    user_id,
    plan_id,
    status,
    started_at,
    expires_at,
    auto_renew,
    referred_by,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_new_plan_id,
    'active',
    now(),
    now() + interval '30 days',
    true,
    p_referred_by,
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
$function$;

-- Update trigger to fire on INSERT as well
DROP TRIGGER IF EXISTS create_affiliate_commission_trigger ON public.subscriptions;

CREATE TRIGGER create_affiliate_commission_trigger
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_affiliate_commission();

-- Update the trigger function to handle INSERT (no OLD record)
CREATE OR REPLACE FUNCTION public.create_affiliate_commission()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  affiliate_user_id uuid;
  commission_amount integer;
  transaction_amount integer;
BEGIN
  -- Only process if subscription has a referrer and is active
  IF NEW.referred_by IS NOT NULL AND NEW.status = 'active' THEN
    
    -- Get the transaction amount for this subscription
    SELECT amount INTO transaction_amount
    FROM public.transactions
    WHERE subscription_id = NEW.id
    ORDER BY created_at DESC
    LIMIT 1;
    
    -- Calculate 10% commission
    IF transaction_amount IS NOT NULL THEN
      commission_amount := FLOOR(transaction_amount * 0.10);
      
      -- Create affiliate earning record (only if not already exists)
      INSERT INTO public.affiliate_earnings (
        affiliate_id,
        referred_user_id,
        subscription_id,
        amount,
        status
      )
      VALUES (
        NEW.referred_by,
        NEW.user_id,
        NEW.id,
        commission_amount,
        'pending'
      )
      ON CONFLICT (subscription_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;