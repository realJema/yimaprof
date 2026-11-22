CREATE TABLE public.study_preferences (
 user_id uuid PRIMARY KEY,
 weekly_goal integer NOT NULL DEFAULT 3,
 deadline_kind text,
 deadline_label text,
 deadline_date date,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_preferences TO authenticated;
GRANT ALL ON public.study_preferences TO service_role;
ALTER TABLE public.study_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learners manage own study preferences" ON public.study_preferences FOR ALL TO authenticated USING (user_id = (select auth.uid())) WITH CHECK (user_id = (select auth.uid()));
CREATE FUNCTION public.validate_study_preferences() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.weekly_goal < 1 OR NEW.weekly_goal > 21 THEN RAISE EXCEPTION 'Invalid weekly goal'; END IF;
 IF (NEW.deadline_date IS NULL) <> (NEW.deadline_kind IS NULL) THEN RAISE EXCEPTION 'Incomplete deadline'; END IF;
 IF NEW.deadline_kind IS NOT NULL AND NEW.deadline_kind NOT IN ('seq1','seq2','seq3','seq4','seq5','seq6','bepc','probatoire','bac','gce_o','gce_a','custom') THEN RAISE EXCEPTION 'Invalid deadline kind'; END IF;
 IF NEW.deadline_kind = 'custom' AND (NEW.deadline_label IS NULL OR length(trim(NEW.deadline_label)) = 0) THEN RAISE EXCEPTION 'Deadline name required'; END IF;
 IF length(NEW.deadline_label) > 60 THEN RAISE EXCEPTION 'Deadline name too long'; END IF;
 RETURN NEW;
END; $$;
CREATE TRIGGER validate_study_preferences BEFORE INSERT OR UPDATE ON public.study_preferences FOR EACH ROW EXECUTE FUNCTION public.validate_study_preferences();
CREATE TRIGGER update_study_preferences_updated_at BEFORE UPDATE ON public.study_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();