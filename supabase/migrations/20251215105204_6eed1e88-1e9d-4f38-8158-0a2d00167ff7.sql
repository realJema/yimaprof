-- Create affiliate_applications table
CREATE TABLE public.affiliate_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.affiliate_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own application"
ON public.affiliate_applications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own application"
ON public.affiliate_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications"
ON public.affiliate_applications
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update applications"
ON public.affiliate_applications
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_affiliate_applications_updated_at
BEFORE UPDATE ON public.affiliate_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update the create_affiliate_commission_on_transaction function to check affiliate approval
CREATE OR REPLACE FUNCTION public.create_affiliate_commission_on_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  subscription_referred_by uuid;
  commission_amount integer;
  affiliate_approved boolean;
BEGIN
  -- Only process completed transactions with a subscription_id
  IF NEW.status = 'completed' AND NEW.subscription_id IS NOT NULL THEN
    
    -- Get the referred_by from the subscription
    SELECT referred_by INTO subscription_referred_by
    FROM public.subscriptions
    WHERE id = NEW.subscription_id;
    
    -- If subscription has a referrer, check if they are an approved affiliate
    IF subscription_referred_by IS NOT NULL THEN
      -- Check if affiliate has approved application
      SELECT EXISTS (
        SELECT 1 FROM public.affiliate_applications
        WHERE user_id = subscription_referred_by
        AND status = 'approved'
      ) INTO affiliate_approved;
      
      -- Only create earning if affiliate is approved
      IF affiliate_approved THEN
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
  END IF;
  
  RETURN NEW;
END;
$function$;