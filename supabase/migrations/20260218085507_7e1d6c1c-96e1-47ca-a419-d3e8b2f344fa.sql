ALTER TABLE public.user_evaluations
  ADD COLUMN IF NOT EXISTS total_score numeric,
  ADD COLUMN IF NOT EXISTS total_possible numeric;