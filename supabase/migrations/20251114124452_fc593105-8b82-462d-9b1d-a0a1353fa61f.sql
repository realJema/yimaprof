-- Drop the incorrectly scoped policy
DROP POLICY IF EXISTS "Only admins can update exams" ON public.exams;

-- Create the UPDATE policy with correct role scope
CREATE POLICY "Only admins can update exams"
ON public.exams
FOR UPDATE
TO authenticated
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