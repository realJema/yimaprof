CREATE TABLE public.lesson_exercise_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  level text NOT NULL,
  percent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.lesson_exercise_results TO authenticated;
GRANT ALL ON public.lesson_exercise_results TO service_role;
ALTER TABLE public.lesson_exercise_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own lesson results" ON public.lesson_exercise_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users add own lesson results" ON public.lesson_exercise_results FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND level IN ('facile','intermediaire','difficile') AND percent BETWEEN 0 AND 100);
CREATE INDEX lesson_exercise_results_user_idx ON public.lesson_exercise_results(user_id, created_at DESC);