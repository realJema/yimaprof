-- Add storage policies for papers bucket to allow PDF uploads

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Admins can upload to papers bucket" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload their own papers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update papers" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can update their own papers" ON storage.objects;

-- Allow admins to upload to papers bucket
CREATE POLICY "Admins can upload to papers bucket"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'papers' 
  AND public.is_admin(auth.uid())
);

-- Allow any authenticated user to upload papers (for exam creation)
CREATE POLICY "Authenticated users can upload papers"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'papers');

-- Allow admins to update papers
CREATE POLICY "Admins can update papers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'papers'
  AND public.is_admin(auth.uid())
);

-- Allow users to update their own papers
CREATE POLICY "Users can update their own papers"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'papers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);