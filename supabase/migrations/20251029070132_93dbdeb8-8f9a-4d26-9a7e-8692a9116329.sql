-- Drop the old trigger first, then the function
DROP TRIGGER IF EXISTS trigger_create_affiliate_commission ON public.subscriptions;
DROP TRIGGER IF EXISTS create_affiliate_commission_trigger ON public.subscriptions;
DROP FUNCTION IF EXISTS public.create_affiliate_commission();

-- Create new function to create affiliate commission when transaction is created
CREATE OR REPLACE FUNCTION public.create_affiliate_commission_on_transaction()
RETURNS TRIGGER AS $$
DECLARE
  subscription_referred_by uuid;
  commission_amount integer;
BEGIN
  -- Only process completed transactions with a subscription_id
  IF NEW.status = 'completed' AND NEW.subscription_id IS NOT NULL THEN
    
    -- Get the referred_by from the subscription
    SELECT referred_by INTO subscription_referred_by
    FROM public.subscriptions
    WHERE id = NEW.subscription_id;
    
    -- If subscription has a referrer, create affiliate earning
    IF subscription_referred_by IS NOT NULL THEN
      -- Calculate 10% commission
      commission_amount := FLOOR(NEW.amount * 0.10);
      
      -- Create affiliate earning record (only if not already exists)
      INSERT INTO public.affiliate_earnings (
        affiliate_id,
        referred_user_id,
        subscription_id,
        transaction_id,
        amount,
        status,
        currency
      )
      VALUES (
        subscription_referred_by,
        NEW.user_id,
        NEW.subscription_id,
        NEW.id,
        commission_amount,
        'pending',
        NEW.currency
      )
      ON CONFLICT (subscription_id) DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on transactions table
CREATE TRIGGER create_affiliate_commission_on_transaction_trigger
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.create_affiliate_commission_on_transaction();