INSERT INTO public.exam_types (name, name_fr, name_en, is_active) VALUES
  ('Examen blanc', 'Examen blanc', 'Mock Exam', true),
  ('Examen harmonisé', 'Examen harmonisé', 'Harmonized Exam', true),
  ('Examen officiel', 'Examen officiel', 'Official Exam', true),
  ('Examen officiel type', 'Examen officiel type', 'Official Type Exam', true)
ON CONFLICT (name) DO NOTHING;