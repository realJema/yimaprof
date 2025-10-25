-- Add username column to profiles table (if not exists)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Add referred_by column to subscriptions to track who referred this subscription
ALTER TABLE public.subscriptions 
ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id);

-- Create affiliate_earnings table to track commission earnings
CREATE TABLE IF NOT EXISTS public.affiliate_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  amount integer NOT NULL,
  currency text DEFAULT 'XOF',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at timestamp with time zone DEFAULT now(),
  paid_at timestamp with time zone,
  UNIQUE(subscription_id)
);

-- Enable RLS on affiliate_earnings
ALTER TABLE public.affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_earnings
CREATE POLICY "Users can view their own earnings"
ON public.affiliate_earnings
FOR SELECT
USING (auth.uid() = affiliate_id);

CREATE POLICY "System can insert earnings"
ON public.affiliate_earnings
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view all earnings"
ON public.affiliate_earnings
FOR SELECT
USING (is_admin(auth.uid()));

-- Create function to calculate and create affiliate commission
CREATE OR REPLACE FUNCTION public.create_affiliate_commission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affiliate_user_id uuid;
  commission_amount integer;
  transaction_amount integer;
BEGIN
  -- Only process if subscription has a referrer and is becoming active
  IF NEW.referred_by IS NOT NULL AND NEW.status = 'active' AND (OLD.status IS NULL OR OLD.status != 'active') THEN
    
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
$$;

-- Create trigger to automatically create affiliate commissions
DROP TRIGGER IF EXISTS trigger_create_affiliate_commission ON public.subscriptions;
CREATE TRIGGER trigger_create_affiliate_commission
AFTER INSERT OR UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.create_affiliate_commission();

-- Add comment for documentation
COMMENT ON TABLE public.affiliate_earnings IS 'Tracks affiliate commissions earned from referrals';
COMMENT ON COLUMN public.profiles.username IS 'Unique username used for affiliate links';