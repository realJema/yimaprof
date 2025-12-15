-- Add RLS policy to allow anyone to view free exams
CREATE POLICY "Anyone can view free exams" 
ON public.exams 
FOR SELECT 
USING (is_published = true AND visibility = 'free');