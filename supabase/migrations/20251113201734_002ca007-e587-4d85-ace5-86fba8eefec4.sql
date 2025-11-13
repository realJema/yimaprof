-- First, let's see what policies currently exist and drop all exam table update policies
DROP POLICY IF EXISTS "Admins can update all exams" ON public.exams;
DROP POLICY IF EXISTS "Creators can update their own exams" ON public.exams;
DROP POLICY IF EXISTS "Admin full update access" ON public.exams;
DROP POLICY IF EXISTS "User own exam update" ON public.exams;

-- Create a single, clear admin update policy using is_admin() function
-- This matches exactly how the Header checks admin status: supabase.rpc('is_admin', { user_id: user?.id })
CREATE POLICY "Admins can update all exams"
ON public.exams
FOR UPDATE
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Create a single policy for creators to update their own exams
CREATE POLICY "Creators can update own exams"
ON public.exams
FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);