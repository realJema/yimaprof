-- Create classes table
CREATE TABLE public.classes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  section TEXT NOT NULL CHECK (section IN ('francophone', 'anglophone')),
  display_name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, section)
);

-- Enable RLS on classes
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

-- Create policy for classes - everyone can view
CREATE POLICY "Anyone can view classes" 
ON public.classes 
FOR SELECT 
USING (true);

-- Create policy for admins to manage classes
CREATE POLICY "Admins can manage classes" 
ON public.classes 
FOR ALL 
USING (is_admin(auth.uid()));

-- Insert francophone classes
INSERT INTO public.classes (name, level, section, display_name, description) VALUES
('class_6e', '6', 'francophone', 'Sixième', 'Classe de sixième du système francophone'),
('class_5e', '7', 'francophone', 'Cinquième', 'Classe de cinquième du système francophone'),
('class_4e', '8', 'francophone', 'Quatrième', 'Classe de quatrième du système francophone'),
('class_3e', '9', 'francophone', 'Troisième', 'Classe de troisième du système francophone'),
('class_2nd', '10', 'francophone', 'Seconde', 'Classe de seconde du système francophone'),
('class_1ere', '11', 'francophone', 'Première', 'Classe de première du système francophone'),
('class_tle', '12', 'francophone', 'Terminale', 'Classe de terminale du système francophone');

-- Insert anglophone classes
INSERT INTO public.classes (name, level, section, display_name, description) VALUES
('form_1', '7', 'anglophone', 'Form 1', 'Form 1 of the anglophone system'),
('form_2', '8', 'anglophone', 'Form 2', 'Form 2 of the anglophone system'),
('form_3', '9', 'anglophone', 'Form 3', 'Form 3 of the anglophone system'),
('form_4', '10', 'anglophone', 'Form 4', 'Form 4 of the anglophone system'),
('form_5', '11', 'anglophone', 'Form 5', 'Form 5 of the anglophone system'),
('lower_sixth', '12', 'anglophone', 'Lower Sixth', 'Lower Sixth of the anglophone system'),
('upper_sixth', '13', 'anglophone', 'Upper Sixth', 'Upper Sixth of the anglophone system');

-- Add foreign key to exams table
ALTER TABLE public.exams 
DROP COLUMN IF EXISTS class_level,
ADD COLUMN class_id UUID REFERENCES public.classes(id);

-- Update existing exams to link to classes
UPDATE public.exams 
SET class_id = (
  SELECT id FROM public.classes 
  WHERE name = 'upper_sixth' 
  LIMIT 1
)
WHERE title LIKE '%Mathematics - Term Test%';

-- Update corrections content to use JSON format
UPDATE public.corrections
SET content = jsonb_build_object(
  'questions', jsonb_build_array(
    jsonb_build_object(
      'id', 1,
      'title', 'Question 1: Calculus (25 marks)',
      'content', 'Given that f(x) = x³ - 3x² + 2x + 1',
      'parts', jsonb_build_array(
        'a) Find f''(x)',
        'b) Determine the turning points', 
        'c) Sketch the graph of f(x)'
      )
    ),
    jsonb_build_object(
      'id', 2,
      'title', 'Question 2: Algebra (25 marks)',
      'content', 'Solve the following equations:',
      'parts', jsonb_build_array(
        'a) 2x² - 7x + 3 = 0',
        'b) log₂(x + 1) = 3'
      )
    ),
    jsonb_build_object(
      'id', 3,
      'title', 'Question 3: Geometry (25 marks)',
      'content', 'In triangle ABC, AB = 5cm, BC = 7cm, AC = 8cm',
      'parts', jsonb_build_array(
        'Calculate the area using Heron''s formula'
      )
    ),
    jsonb_build_object(
      'id', 4,
      'title', 'Question 4: Statistics (25 marks)',
      'content', 'A sample of 50 students took an exam with mean score 65 and standard deviation 12.',
      'parts', jsonb_build_array(
        'Calculate the probability that a randomly selected student scored above 80.'
      )
    )
  ),
  'answers', jsonb_build_array(
    jsonb_build_object(
      'question_id', 1,
      'title', 'Solution 1: Calculus (25 marks)',
      'solutions', jsonb_build_array(
        jsonb_build_object(
          'part', 'a',
          'solution', 'f(x) = x³ - 3x² + 2x + 1\nf''(x) = 3x² - 6x + 2\nf''''(x) = 6x - 6'
        ),
        jsonb_build_object(
          'part', 'b', 
          'solution', 'For turning points, f''(x) = 0\n3x² - 6x + 2 = 0\nUsing quadratic formula: x = (6 ± √(36-24))/6 = (6 ± √12)/6 = (6 ± 2√3)/6 = 1 ± √3/3\nTurning points: x₁ = 1 - √3/3 ≈ 0.42, x₂ = 1 + √3/3 ≈ 1.58'
        ),
        jsonb_build_object(
          'part', 'c',
          'solution', 'f''''(x) = 6x - 6 = 0 when x = 1 (inflection point)\nf(0) = 1, f(1) = 1\nThe function has a local maximum at x₁ and local minimum at x₂'
        )
      )
    ),
    jsonb_build_object(
      'question_id', 2,
      'title', 'Solution 2: Algebra (25 marks)',
      'solutions', jsonb_build_array(
        jsonb_build_object(
          'part', 'a',
          'solution', 'Using quadratic formula: x = (7 ± √(49-24))/4 = (7 ± √25)/4 = (7 ± 5)/4\nx₁ = 3, x₂ = 1/2'
        ),
        jsonb_build_object(
          'part', 'b',
          'solution', 'x + 1 = 2³ = 8\nx = 7'
        )
      )
    ),
    jsonb_build_object(
      'question_id', 3,
      'title', 'Solution 3: Geometry (25 marks)',
      'solutions', jsonb_build_array(
        jsonb_build_object(
          'part', 'a',
          'solution', 'Using Heron''s formula:\ns = (a + b + c)/2 = (5 + 7 + 8)/2 = 10\nArea = √(s(s-a)(s-b)(s-c))\nArea = √(10 × 5 × 3 × 2) = √300 = 10√3 ≈ 17.32 cm²'
        )
      )
    ),
    jsonb_build_object(
      'question_id', 4,
      'title', 'Solution 4: Statistics (25 marks)',
      'solutions', jsonb_build_array(
        jsonb_build_object(
          'part', 'a',
          'solution', 'Given: μ = 65, σ = 12\nP(X > 80) = P(Z > (80-65)/12) = P(Z > 1.25)\nUsing standard normal table: P(Z > 1.25) ≈ 0.1056 or 10.56%'
        )
      )
    )
  )
)
WHERE exam_id = '3784fd2a-3477-4936-bba4-9afce4ca079e';

-- Update exam content to JSON format  
UPDATE public.exams
SET content = jsonb_build_object(
  'exam_info', jsonb_build_object(
    'duration', '3 hours',
    'total_marks', 100,
    'instructions', 'Answer all questions. Show all working clearly.'
  ),
  'questions', jsonb_build_array(
    jsonb_build_object(
      'id', 1,
      'title', 'Question 1: Calculus (25 marks)',
      'content', 'Given that f(x) = x³ - 3x² + 2x + 1',
      'parts', jsonb_build_array(
        'a) Find f''(x)',
        'b) Determine the turning points',
        'c) Sketch the graph of f(x)'
      ),
      'marks', 25
    ),
    jsonb_build_object(
      'id', 2, 
      'title', 'Question 2: Algebra (25 marks)',
      'content', 'Solve the following equations:',
      'parts', jsonb_build_array(
        'a) 2x² - 7x + 3 = 0',
        'b) log₂(x + 1) = 3'
      ),
      'marks', 25
    ),
    jsonb_build_object(
      'id', 3,
      'title', 'Question 3: Geometry (25 marks)', 
      'content', 'In triangle ABC, AB = 5cm, BC = 7cm, AC = 8cm',
      'parts', jsonb_build_array(
        'Calculate the area using Heron''s formula'
      ),
      'marks', 25
    ),
    jsonb_build_object(
      'id', 4,
      'title', 'Question 4: Statistics (25 marks)',
      'content', 'A sample of 50 students took an exam with mean score 65 and standard deviation 12.',
      'parts', jsonb_build_array(
        'Calculate the probability that a randomly selected student scored above 80.'
      ),
      'marks', 25
    )
  )
)
WHERE id = '3784fd2a-3477-4936-bba4-9afce4ca079e';

-- Create trigger for updated_at
CREATE TRIGGER update_classes_updated_at
BEFORE UPDATE ON public.classes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();