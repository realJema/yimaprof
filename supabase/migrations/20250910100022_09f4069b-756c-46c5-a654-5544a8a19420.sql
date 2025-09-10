-- First, let's safely convert text content to jsonb, handling invalid JSON
UPDATE public.exams 
SET content = CASE 
    WHEN content IS NULL OR content = '' THEN NULL
    WHEN content ~ '^[[:space:]]*[\{\[]' THEN content::jsonb  -- Looks like JSON
    ELSE jsonb_build_object('raw_text', content)  -- Wrap non-JSON text
END
WHERE content IS NOT NULL;

-- Now change the column type to jsonb
ALTER TABLE public.exams ALTER COLUMN content TYPE jsonb USING content::jsonb;

-- Create a function to merge correction data into exam content
CREATE OR REPLACE FUNCTION merge_corrections_into_exams()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    exam_record RECORD;
    correction_record RECORD;
    updated_content jsonb;
BEGIN
    -- Loop through all exams that have corrections
    FOR exam_record IN 
        SELECT e.id, e.content 
        FROM public.exams e 
        WHERE EXISTS (SELECT 1 FROM public.corrections c WHERE c.exam_id = e.id)
    LOOP
        -- Get the correction for this exam
        SELECT content INTO correction_record 
        FROM public.corrections 
        WHERE exam_id = exam_record.id 
        AND is_published = true 
        LIMIT 1;
        
        -- If exam content is null, initialize it
        IF exam_record.content IS NULL THEN
            updated_content := '{}'::jsonb;
        ELSE
            updated_content := exam_record.content;
        END IF;
        
        -- Add answers from correction to the content
        IF correction_record.content IS NOT NULL THEN
            updated_content := updated_content || jsonb_build_object('answers', correction_record.content);
        END IF;
        
        -- Update the exam with merged content
        UPDATE public.exams 
        SET content = updated_content 
        WHERE id = exam_record.id;
    END LOOP;
END;
$$;

-- Execute the merge function
SELECT merge_corrections_into_exams();

-- Drop the merge function
DROP FUNCTION merge_corrections_into_exams();

-- Drop the corrections table and its policies
DROP POLICY IF EXISTS "Anyone can view published corrections" ON public.corrections;
DROP POLICY IF EXISTS "Teachers and admins can manage corrections" ON public.corrections;
DROP TABLE public.corrections;

-- Ensure proper foreign key to classes
ALTER TABLE public.exams 
DROP CONSTRAINT IF EXISTS exams_class_id_fkey;

ALTER TABLE public.exams 
ADD CONSTRAINT exams_class_id_fkey 
FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE SET NULL;

-- Update RLS policies
DROP POLICY IF EXISTS "Anyone can view published exams" ON public.exams;
DROP POLICY IF EXISTS "Teachers and admins can manage exams" ON public.exams;

CREATE POLICY "Anyone can view published exams" 
ON public.exams 
FOR SELECT 
USING (is_published = true AND visibility = 'public');

CREATE POLICY "Teachers and admins can manage exams" 
ON public.exams 
FOR ALL 
USING (
    get_user_role(auth.uid()) = ANY (ARRAY['teacher'::user_role, 'admin'::user_role]) 
    OR auth.uid() = created_by
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON public.exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_content_gin ON public.exams USING GIN(content);