-- Add price columns for trimester and annual billing cycles
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_trimester integer,
ADD COLUMN IF NOT EXISTS price_annual integer;

-- Add comment for documentation
COMMENT ON COLUMN public.subscription_plans.price_trimester IS 'Price for 3-month (trimester) billing cycle';
COMMENT ON COLUMN public.subscription_plans.price_annual IS 'Price for 9-month (annual) billing cycle';