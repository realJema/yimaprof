-- Add RLS policies for exams table to allow INSERT and UPDATE

-- Allow admins to manage all exams
CREATE POLICY "Admins can insert exams"
ON public.exams
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update exams"
ON public.exams
FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete exams"
ON public.exams
FOR DELETE
TO authenticated
USING (public.is_admin(auth.uid()));

-- Allow teachers to manage their own exams
CREATE POLICY "Teachers can insert their own exams"
ON public.exams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Teachers can update their own exams"
ON public.exams
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

CREATE POLICY "Teachers can delete their own exams"
ON public.exams
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);