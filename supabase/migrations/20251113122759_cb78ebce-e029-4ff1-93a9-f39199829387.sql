-- Fix function search path issue for harmonize_exam_data
DROP FUNCTION IF EXISTS harmonize_exam_data();

CREATE OR REPLACE FUNCTION harmonize_exam_data() 
RETURNS void 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;