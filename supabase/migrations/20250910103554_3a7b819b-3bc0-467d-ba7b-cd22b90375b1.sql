-- Add foreign key relationships for user_id columns to profiles table
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transactions 
ADD CONSTRAINT transactions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add foreign key for subscriptions plan_id
ALTER TABLE public.subscriptions 
ADD CONSTRAINT subscriptions_plan_id_fkey 
FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE CASCADE;