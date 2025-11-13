-- Phase 1: Create Supporting Tables for Standardized Data

-- Table for standardized subjects
CREATE TABLE subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  name_en TEXT,
  name_fr TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for exam types (only 2 standard types)
CREATE TABLE exam_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  name_en TEXT,
  name_fr TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for periods/semesters
CREATE TABLE periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  name_en TEXT,
  name_fr TEXT,
  order_number INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for academic years
CREATE TABLE academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  year_label TEXT UNIQUE NOT NULL,
  start_year INTEGER NOT NULL,
  end_year INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Table for standard durations
CREATE TABLE durations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  minutes INTEGER UNIQUE NOT NULL,
  display_label TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Insert standard exam types
INSERT INTO exam_types (name, name_en, name_fr) VALUES
  ('during_year', 'During the Year Evaluation', 'Évaluation en Cours d''Année'),
  ('end_term', 'End of Term Evaluation', 'Évaluation de Fin de Période');

-- Insert standard periods
INSERT INTO periods (name, name_en, name_fr, order_number) VALUES
  ('1st_semester', '1st Semester', '1er Semestre', 1),
  ('2nd_semester', '2nd Semester', '2ème Semestre', 2),
  ('3rd_trimester', '3rd Trimester', '3ème Trimestre', 3);

-- Insert standard durations
INSERT INTO durations (minutes, display_label) VALUES
  (30, '30 min'), (45, '45 min'), (60, '1h'),
  (90, '1h30'), (120, '2h'), (150, '2h30'),
  (180, '3h'), (240, '4h');

-- Insert academic years
INSERT INTO academic_years (year_label, start_year, end_year) VALUES
  ('2018-2019', 2018, 2019),
  ('2019-2020', 2019, 2020),
  ('2020-2021', 2020, 2021),
  ('2021-2022', 2021, 2022),
  ('2022-2023', 2022, 2023),
  ('2023-2024', 2023, 2024),
  ('2024-2025', 2024, 2025),
  ('2025-2026', 2025, 2026);

-- Insert harmonized subjects
INSERT INTO subjects (name, name_en, name_fr) VALUES
  ('mathematics', 'Mathematics', 'Mathématiques'),
  ('english', 'English', 'Anglais'),
  ('french', 'French Language', 'Langue Française'),
  ('physics', 'Physics', 'Physique'),
  ('chemistry', 'Chemistry', 'Chimie'),
  ('biology', 'Biology', 'Sciences de la Vie et de la Terre'),
  ('history', 'History', 'Histoire'),
  ('geography', 'Geography', 'Géographie'),
  ('philosophy', 'Philosophy', 'Philosophie'),
  ('spanish', 'Spanish', 'Espagnol'),
  ('german', 'German', 'Allemand'),
  ('computer_science', 'Computer Science', 'Informatique'),
  ('economics', 'Economics', 'Sciences Économiques'),
  ('literature', 'Literature', 'Littérature'),
  ('citizenship', 'Citizenship Education', 'Éducation Civique et Morale'),
  ('physical_education', 'Physical Education', 'Éducation Physique et Sportive');

-- Add new foreign key columns to exams table
ALTER TABLE exams 
  ADD COLUMN subject_id UUID REFERENCES subjects(id),
  ADD COLUMN exam_type_id UUID REFERENCES exam_types(id),
  ADD COLUMN period_id UUID REFERENCES periods(id),
  ADD COLUMN academic_year_id UUID REFERENCES academic_years(id),
  ADD COLUMN duration_id UUID REFERENCES durations(id);

-- Phase 2: Data Migration & Harmonization Function
CREATE OR REPLACE FUNCTION harmonize_exam_data() 
RETURNS void AS $$
DECLARE
  exam_record RECORD;
  subject_id_match UUID;
  exam_type_id_match UUID;
  period_id_match UUID;
  year_id_match UUID;
  duration_id_match UUID;
BEGIN
  FOR exam_record IN SELECT * FROM exams LOOP
    
    -- Match subject (case-insensitive, trimmed)
    SELECT id INTO subject_id_match
    FROM subjects 
    WHERE LOWER(TRIM(name_fr)) = LOWER(TRIM(exam_record.subject))
       OR LOWER(TRIM(name_en)) = LOWER(TRIM(exam_record.subject))
       OR LOWER(TRIM(name)) LIKE '%' || LOWER(TRIM(exam_record.subject)) || '%'
    LIMIT 1;
    
    -- Match exam_type
    SELECT id INTO exam_type_id_match
    FROM exam_types
    WHERE name = CASE 
      WHEN LOWER(TRIM(exam_record.exam_type)) LIKE '%test%' THEN 'during_year'
      WHEN LOWER(TRIM(exam_record.exam_type)) LIKE '%cours%' THEN 'during_year'
      WHEN LOWER(TRIM(exam_record.exam_type)) LIKE '%exam%' THEN 'end_term'
      WHEN LOWER(TRIM(exam_record.exam_type)) LIKE '%fin%' THEN 'end_term'
      ELSE 'during_year'
    END
    LIMIT 1;
    
    -- Match period
    SELECT id INTO period_id_match
    FROM periods
    WHERE LOWER(TRIM(name_en)) LIKE '%' || LOWER(TRIM(exam_record.period)) || '%'
       OR LOWER(TRIM(name_fr)) LIKE '%' || LOWER(TRIM(exam_record.period)) || '%'
    LIMIT 1;
    
    -- Match academic year
    SELECT id INTO year_id_match
    FROM academic_years
    WHERE start_year = exam_record.year
    LIMIT 1;
    
    -- Match duration (find closest)
    SELECT id INTO duration_id_match
    FROM durations
    ORDER BY ABS(minutes - COALESCE(exam_record.duration_minutes, 120))
    LIMIT 1;
    
    -- Update exam with matched IDs
    UPDATE exams
    SET 
      subject_id = subject_id_match,
      exam_type_id = exam_type_id_match,
      period_id = period_id_match,
      academic_year_id = year_id_match,
      duration_id = duration_id_match
    WHERE id = exam_record.id;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute the harmonization
SELECT harmonize_exam_data();

-- Phase 5: RLS Policies for New Tables
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE durations ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (for dropdowns)
CREATE POLICY "Anyone can view subjects" ON subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view exam_types" ON exam_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view periods" ON periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view academic_years" ON academic_years FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view durations" ON durations FOR SELECT TO authenticated USING (true);

-- Only admins can insert/update/delete
CREATE POLICY "Admins can manage subjects" ON subjects FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage exam_types" ON exam_types FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage periods" ON periods FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage academic_years" ON academic_years FOR ALL TO authenticated USING (is_admin(auth.uid()));
CREATE POLICY "Admins can manage durations" ON durations FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- Add updated_at triggers
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_exam_types_updated_at BEFORE UPDATE ON exam_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_periods_updated_at BEFORE UPDATE ON periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_years_updated_at BEFORE UPDATE ON academic_years
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_durations_updated_at BEFORE UPDATE ON durations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();