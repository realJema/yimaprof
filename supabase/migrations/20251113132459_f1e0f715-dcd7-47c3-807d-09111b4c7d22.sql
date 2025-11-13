-- Drop all UPDATE policies for exams
DROP POLICY IF EXISTS "Admins can update any exam" ON exams;
DROP POLICY IF EXISTS "Users can update their own exams" ON exams;

-- Create a single, simple UPDATE policy for testing
CREATE POLICY "Authenticated users can update exams"
ON exams
FOR UPDATE
TO authenticated
USING (
  is_admin(auth.uid()) OR auth.uid() = created_by
)
WITH CHECK (
  is_admin(auth.uid()) OR auth.uid() = created_by
);