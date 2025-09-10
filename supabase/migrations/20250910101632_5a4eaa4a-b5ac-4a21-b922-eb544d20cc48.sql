-- Clear existing subscription plans and add the 3 main plans
DELETE FROM public.subscription_plans;

-- Insert the 3 main subscription plans
INSERT INTO public.subscription_plans (name, description, price, currency, duration_days, features, max_downloads, is_active) VALUES
(
  'Francophone',
  'Access to French curriculum exams and corrections',
  1500,
  'XOF',
  30,
  '["Access to French curriculum exams", "View corrections and solutions", "Download exam papers", "Basic support"]'::jsonb,
  50,
  true
),
(
  'Anglophone', 
  'Access to English curriculum exams and corrections',
  1500,
  'XOF', 
  30,
  '["Access to English curriculum exams", "View corrections and solutions", "Download exam papers", "Basic support"]'::jsonb,
  50,
  true
),
(
  'Everything',
  'Complete access to all exam systems and premium features',
  2500,
  'XOF',
  30, 
  '["Access to ALL exam systems", "Unlimited corrections and solutions", "Unlimited downloads", "Priority support", "Early access to new content", "Advanced analytics"]'::jsonb,
  999999,
  true
);