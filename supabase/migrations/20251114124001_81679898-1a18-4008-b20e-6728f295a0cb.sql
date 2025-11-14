-- Drop all existing update policies on exams
DROP POLICY IF EXISTS "Admins can update all exams" ON public.exams;
DROP POLICY IF EXISTS "Creators can update own exams" ON public.exams;
DROP POLICY IF EXISTS "Admin full update access" ON public.exams;
DROP POLICY IF EXISTS "User own exam update" ON public.exams;
DROP POLICY IF EXISTS "Creators can update their own exams" ON public.exams;

-- Create single policy: only admins can update exams using direct relationship
CREATE POLICY "Only admins can update exams"
ON public.exams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);