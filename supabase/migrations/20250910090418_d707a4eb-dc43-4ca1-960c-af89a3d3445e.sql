-- Update subscription plans with the specific tiers you want
UPDATE public.subscription_plans SET is_active = false WHERE true;

INSERT INTO public.subscription_plans (
  name, 
  description, 
  price, 
  currency, 
  duration_days, 
  features,
  max_downloads,
  is_active
) VALUES 
('Anglophone Only', 'Access to Anglophone section exams and corrections', 200000, 'XAF', 30, 
 '["Access to Anglophone section", "Download exams", "View corrections", "Offline access"]'::jsonb, 
 100, true),
('Francophone Only', 'Access to Francophone section exams and corrections', 200000, 'XAF', 30,
 '["Access to Francophone section", "Download exams", "View corrections", "Offline access"]'::jsonb, 
 100, true),
('Everything', 'Complete access to both Anglophone and Francophone sections', 500000, 'XAF', 30,
 '["Access to all sections", "Unlimited downloads", "View all corrections", "Offline access", "Priority support"]'::jsonb, 
 -1, true);

-- Update user roles enum to include admin if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'parent', 'teacher', 'admin');
    END IF;
END $$;