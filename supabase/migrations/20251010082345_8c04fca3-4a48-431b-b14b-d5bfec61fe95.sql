-- Create RLS policies for papers storage bucket

-- Allow teachers and admins to upload files to papers bucket
CREATE POLICY "Teachers and admins can upload papers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'papers' 
  AND (
    get_user_role(auth.uid()) = 'teacher'::user_role 
    OR get_user_role(auth.uid()) = 'admin'::user_role
  )
);

-- Allow teachers and admins to update files in papers bucket
CREATE POLICY "Teachers and admins can update papers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'papers' 
  AND (
    get_user_role(auth.uid()) = 'teacher'::user_role 
    OR get_user_role(auth.uid()) = 'admin'::user_role
  )
);

-- Allow teachers and admins to delete files from papers bucket
CREATE POLICY "Teachers and admins can delete papers"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'papers' 
  AND (
    get_user_role(auth.uid()) = 'teacher'::user_role 
    OR get_user_role(auth.uid()) = 'admin'::user_role
  )
);

-- Allow anyone to view files in papers bucket (since bucket is public)
CREATE POLICY "Anyone can view papers"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'papers');