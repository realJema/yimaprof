ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS name_fr text, ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_fr text, ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS features_fr jsonb, ADD COLUMN IF NOT EXISTS features_en jsonb;
UPDATE public.subscription_plans SET name_fr = COALESCE(name_fr, name), description_fr = COALESCE(description_fr, description), features_fr = COALESCE(features_fr, features);

ALTER TABLE public.exams ADD COLUMN IF NOT EXISTS series_ids uuid[] NOT NULL DEFAULT '{}';
UPDATE public.exams SET series_ids = ARRAY[series_id] WHERE series_id IS NOT NULL AND cardinality(series_ids) = 0;

ALTER TABLE public.challenges ALTER COLUMN starts_at SET DEFAULT now();
ALTER TABLE public.challenges ALTER COLUMN starts_at DROP NOT NULL;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS pdf_url text;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'approved';
ALTER TABLE public.challenges ADD COLUMN IF NOT EXISTS review_note text;