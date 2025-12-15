-- Allow editors to view all exams (published or not)
CREATE POLICY "Editors can view all exams"
ON public.exams
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'editor'::app_role
  )
);

-- Allow editors to update exams
CREATE POLICY "Editors can update exams"
ON public.exams
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'editor'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'editor'::app_role
  )
);