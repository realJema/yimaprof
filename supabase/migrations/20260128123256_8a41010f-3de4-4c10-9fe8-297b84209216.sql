-- Create storage bucket for exam content images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('exam-images', 'exam-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view exam images (they're part of public exams)
CREATE POLICY "Anyone can view exam images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'exam-images');

-- Allow authenticated users with admin/editor roles to upload exam images
CREATE POLICY "Admins and editors can upload exam images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'exam-images' 
  AND auth.uid() IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Allow admins and editors to update exam images
CREATE POLICY "Admins and editors can update exam images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'exam-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);

-- Allow admins and editors to delete exam images
CREATE POLICY "Admins and editors can delete exam images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'exam-images'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'editor')
  )
);