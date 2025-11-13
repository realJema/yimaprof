-- Drop the existing policy
DROP POLICY IF EXISTS "Authenticated users can update exams" ON exams;

-- Create separate, clearer policies for UPDATE
-- Policy 1: Admins can update any exam (simpler check)
CREATE POLICY "Admin full update access"
ON exams
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'::app_role
  )
);

-- Policy 2: Users can update their own exams
CREATE POLICY "User own exam update"
ON exams
FOR UPDATE  
TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);