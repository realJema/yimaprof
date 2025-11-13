-- Drop the existing admin update policy that uses direct EXISTS
DROP POLICY IF EXISTS "Admin full update access" ON public.exams;

-- Create a clean admin update policy using the is_admin function
CREATE POLICY "Admins can update all exams"
ON public.exams
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Drop the redundant user own exam update policy to avoid confusion
DROP POLICY IF EXISTS "User own exam update" ON public.exams;

-- Create a clear policy for teachers/creators to update their own exams
CREATE POLICY "Creators can update their own exams"
ON public.exams
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);