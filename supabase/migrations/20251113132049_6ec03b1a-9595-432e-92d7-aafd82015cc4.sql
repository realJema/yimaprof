-- Drop existing problematic policies for exams UPDATE
DROP POLICY IF EXISTS "Teachers can update their own exams" ON exams;
DROP POLICY IF EXISTS "Admins can update exams" ON exams;

-- Create better UPDATE policies with explicit WITH CHECK clauses
CREATE POLICY "Admins can update any exam"
ON exams
FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Users can update their own exams"
ON exams
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
