-- Update 5 exams to be free (accessible to everyone)
UPDATE public.exams 
SET visibility = 'free' 
WHERE id IN (
  SELECT id FROM public.exams 
  WHERE is_published = true 
  ORDER BY created_at DESC 
  LIMIT 5
);