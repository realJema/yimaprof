-- Step 1: Populate missing ID fields using harmonization
SELECT harmonize_exam_data();

-- Step 2: Handle remaining nulls - create a default "Other" subject if needed
INSERT INTO subjects (name, name_fr, name_en, is_active)
VALUES ('Other', 'Autre', 'Other', true)
ON CONFLICT DO NOTHING;

-- Get the "Other" subject id and use it for nulls
WITH other_subject AS (
  SELECT id FROM subjects WHERE name IN ('Other', 'Autre', 'other') LIMIT 1
)
UPDATE exams 
SET subject_id = (SELECT id FROM other_subject)
WHERE subject_id IS NULL;

-- Handle remaining period nulls
UPDATE exams 
SET period_id = (SELECT id FROM periods ORDER BY order_number LIMIT 1)
WHERE period_id IS NULL;

-- Handle remaining academic year nulls
UPDATE exams 
SET academic_year_id = (SELECT id FROM academic_years ORDER BY start_year DESC LIMIT 1)
WHERE academic_year_id IS NULL;

-- Step 3: Make new ID fields NOT NULL
ALTER TABLE exams 
  ALTER COLUMN subject_id SET NOT NULL,
  ALTER COLUMN exam_type_id SET NOT NULL,
  ALTER COLUMN period_id SET NOT NULL,
  ALTER COLUMN academic_year_id SET NOT NULL,
  ALTER COLUMN duration_id SET NOT NULL;

-- Step 4: Drop old text columns
ALTER TABLE exams 
  DROP COLUMN IF EXISTS subject,
  DROP COLUMN IF EXISTS exam_type,
  DROP COLUMN IF EXISTS period,
  DROP COLUMN IF EXISTS year,
  DROP COLUMN IF EXISTS duration_minutes;

-- Step 5: Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_exams_subject_id ON exams(subject_id);
CREATE INDEX IF NOT EXISTS idx_exams_exam_type_id ON exams(exam_type_id);
CREATE INDEX IF NOT EXISTS idx_exams_period_id ON exams(period_id);
CREATE INDEX IF NOT EXISTS idx_exams_academic_year_id ON exams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exams_duration_id ON exams(duration_id);
CREATE INDEX IF NOT EXISTS idx_exams_establishment_id ON exams(establishment_id);
CREATE INDEX IF NOT EXISTS idx_exams_class_id ON exams(class_id);
CREATE INDEX IF NOT EXISTS idx_exams_is_published ON exams(is_published);