
-- Update Everything plan price to 2500 FCFA
UPDATE public.subscription_plans
SET price = 2500,
    price_trimester = NULL,
    price_annual = NULL,
    updated_at = now()
WHERE name = 'Everything';

-- Insert new Prépa Examen plan
INSERT INTO public.subscription_plans (name, description, price, currency, duration_days, features, max_downloads, is_active)
VALUES (
  'Prépa Examen',
  'Accès à toutes les épreuves du troisième trimestre : examens officiels, épreuves blanches, épreuves zéro et contenus de préparation.',
  1000,
  'XOF',
  30,
  '["Accès à toutes les épreuves du 3e trimestre","Examens officiels inclus","Épreuves blanches et épreuves zéro","Corrections et solutions complètes","Préparation ciblée aux examens","Téléchargements illimités"]'::jsonb,
  999999,
  true
);
