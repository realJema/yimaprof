-- Create user_evaluations table to store evaluation attempts
CREATE TABLE public.user_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  mcq_score INTEGER,
  mcq_total INTEGER,
  time_spent_seconds INTEGER,
  answers JSONB DEFAULT '{}'::jsonb,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own evaluations"
ON public.user_evaluations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own evaluations"
ON public.user_evaluations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluations"
ON public.user_evaluations
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Create index for faster queries
CREATE INDEX idx_user_evaluations_user_exam ON public.user_evaluations(user_id, exam_id);
CREATE INDEX idx_user_evaluations_exam ON public.user_evaluations(exam_id);