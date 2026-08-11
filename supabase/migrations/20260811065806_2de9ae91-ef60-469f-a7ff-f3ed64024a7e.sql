-- =========================
-- 1. Establishments extras
-- =========================
ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS owner_id uuid,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE UNIQUE INDEX IF NOT EXISTS establishments_referral_code_key ON public.establishments(referral_code) WHERE referral_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS establishments_owner_id_idx ON public.establishments(owner_id);

-- =========================
-- 2. Helper functions
-- =========================
CREATE OR REPLACE FUNCTION public.current_establishment_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT establishment_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_establishment_admin(_user_id uuid, _establishment_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
    OR (
      public.has_role(_user_id, 'school_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _user_id AND p.establishment_id = _establishment_id
      )
    );
$$;

REVOKE ALL ON FUNCTION public.current_establishment_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_establishment_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_establishment_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_establishment_admin(uuid, uuid) TO authenticated, service_role;

-- =========================
-- 3. School classes
-- =========================
CREATE TABLE IF NOT EXISTS public.establishment_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  label text,
  teacher_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (establishment_id, class_id, label)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishment_classes TO authenticated;
GRANT ALL ON public.establishment_classes TO service_role;
ALTER TABLE public.establishment_classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins manage their classes" ON public.establishment_classes
  FOR ALL TO authenticated
  USING (public.is_establishment_admin(auth.uid(), establishment_id))
  WITH CHECK (public.is_establishment_admin(auth.uid(), establishment_id));
CREATE TRIGGER update_establishment_classes_updated_at BEFORE UPDATE ON public.establishment_classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4. School students
-- =========================
CREATE TABLE IF NOT EXISTS public.establishment_students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  user_id uuid,
  full_name text NOT NULL,
  email text,
  phone text,
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS establishment_students_est_idx ON public.establishment_students(establishment_id);
CREATE INDEX IF NOT EXISTS establishment_students_user_idx ON public.establishment_students(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.establishment_students TO authenticated;
GRANT ALL ON public.establishment_students TO service_role;
ALTER TABLE public.establishment_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins manage their students" ON public.establishment_students
  FOR ALL TO authenticated
  USING (public.is_establishment_admin(auth.uid(), establishment_id))
  WITH CHECK (public.is_establishment_admin(auth.uid(), establishment_id));
CREATE POLICY "Students can view their own school record" ON public.establishment_students
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER update_establishment_students_updated_at BEFORE UPDATE ON public.establishment_students
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 5. Lessons
-- =========================
CREATE TABLE IF NOT EXISTS public.lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text,
  content text,
  file_url text,
  chapter text,
  order_number integer NOT NULL DEFAULT 1,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  series_id uuid REFERENCES public.series(id) ON DELETE SET NULL,
  language text NOT NULL DEFAULT 'fr',
  estimated_minutes integer,
  is_published boolean NOT NULL DEFAULT true,
  is_free boolean NOT NULL DEFAULT false,
  view_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS lessons_class_subject_idx ON public.lessons(class_id, subject_id);
GRANT SELECT ON public.lessons TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT ALL ON public.lessons TO service_role;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published lessons" ON public.lessons
  FOR SELECT USING (is_published = true);
CREATE POLICY "Staff manage lessons" ON public.lessons
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));
CREATE TRIGGER update_lessons_updated_at BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.lesson_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  exam_id uuid NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  order_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, exam_id)
);
GRANT SELECT ON public.lesson_exercises TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_exercises TO authenticated;
GRANT ALL ON public.lesson_exercises TO service_role;
ALTER TABLE public.lesson_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read lesson exercises" ON public.lesson_exercises
  FOR SELECT USING (true);
CREATE POLICY "Staff manage lesson exercises" ON public.lesson_exercises
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'editor'::app_role));

CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'in_progress',
  progress_percent integer NOT NULL DEFAULT 0,
  time_spent_seconds integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, user_id)
);
CREATE INDEX IF NOT EXISTS lesson_progress_user_idx ON public.lesson_progress(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_progress TO authenticated;
GRANT ALL ON public.lesson_progress TO service_role;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own lesson progress" ON public.lesson_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_lesson_progress_updated_at BEFORE UPDATE ON public.lesson_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 6. Challenges
-- =========================
CREATE TABLE IF NOT EXISTS public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  scope text NOT NULL DEFAULT 'inter_class',
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  status text NOT NULL DEFAULT 'active',
  reward text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS challenges_est_idx ON public.challenges(establishment_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins manage their challenges" ON public.challenges
  FOR ALL TO authenticated
  USING (public.is_establishment_admin(auth.uid(), establishment_id))
  WITH CHECK (public.is_establishment_admin(auth.uid(), establishment_id));
CREATE POLICY "Students can view their school challenges" ON public.challenges
  FOR SELECT TO authenticated
  USING (establishment_id = public.current_establishment_id());
CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.challenge_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.establishment_students(id) ON DELETE CASCADE,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  points integer NOT NULL DEFAULT 0,
  evaluations_count integer NOT NULL DEFAULT 0,
  average_percent numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, student_id)
);
CREATE INDEX IF NOT EXISTS challenge_participants_challenge_idx ON public.challenge_participants(challenge_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_participants TO authenticated;
GRANT ALL ON public.challenge_participants TO service_role;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins manage their challenge participants" ON public.challenge_participants
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND public.is_establishment_admin(auth.uid(), c.establishment_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND public.is_establishment_admin(auth.uid(), c.establishment_id)));
CREATE POLICY "Students can view their school challenge participants" ON public.challenge_participants
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.establishment_id = public.current_establishment_id()));
CREATE TRIGGER update_challenge_participants_updated_at BEFORE UPDATE ON public.challenge_participants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 7. Revenue & payouts
-- =========================
CREATE TABLE IF NOT EXISTS public.establishment_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES public.establishment_students(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  referred_name text,
  plan_name text,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX IF NOT EXISTS establishment_commissions_est_idx ON public.establishment_commissions(establishment_id);
GRANT SELECT ON public.establishment_commissions TO authenticated;
GRANT ALL ON public.establishment_commissions TO service_role;
ALTER TABLE public.establishment_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins view their commissions" ON public.establishment_commissions
  FOR SELECT TO authenticated
  USING (public.is_establishment_admin(auth.uid(), establishment_id));

CREATE TABLE IF NOT EXISTS public.establishment_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment_id uuid NOT NULL REFERENCES public.establishments(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'XAF',
  method text NOT NULL DEFAULT 'mtn_momo',
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  note text,
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS establishment_payouts_est_idx ON public.establishment_payouts(establishment_id);
GRANT SELECT, INSERT ON public.establishment_payouts TO authenticated;
GRANT ALL ON public.establishment_payouts TO service_role;
ALTER TABLE public.establishment_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "School admins view their payouts" ON public.establishment_payouts
  FOR SELECT TO authenticated
  USING (public.is_establishment_admin(auth.uid(), establishment_id));
CREATE POLICY "School admins request payouts" ON public.establishment_payouts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_establishment_admin(auth.uid(), establishment_id) AND requested_by = auth.uid() AND status = 'pending');
CREATE POLICY "Platform admins update payouts" ON public.establishment_payouts
  FOR UPDATE TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER update_establishment_payouts_updated_at BEFORE UPDATE ON public.establishment_payouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 8. Self-serve registration
-- =========================
CREATE OR REPLACE FUNCTION public.register_establishment(
  p_name text, p_type text DEFAULT 'private', p_city text DEFAULT NULL,
  p_country text DEFAULT 'CM', p_contact_email text DEFAULT NULL, p_contact_phone text DEFAULT NULL
) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_code text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) < 3 THEN
    RETURN json_build_object('success', false, 'error', 'Invalid school name');
  END IF;
  IF EXISTS (SELECT 1 FROM public.establishments WHERE owner_id = v_uid) THEN
    RETURN json_build_object('success', false, 'error', 'You already own a school');
  END IF;

  v_code := upper(substr(regexp_replace(trim(p_name), '[^a-zA-Z]', '', 'g'), 1, 4))
            || substr(replace(gen_random_uuid()::text, '-', ''), 1, 4);

  INSERT INTO public.establishments (name, type, country, city, contact_email, contact_phone, owner_id, referral_code)
  VALUES (trim(left(p_name, 150)), coalesce(p_type, 'private'), coalesce(p_country, 'CM'),
          left(p_city, 100), left(p_contact_email, 255), left(p_contact_phone, 30), v_uid, upper(v_code))
  RETURNING id INTO v_id;

  UPDATE public.profiles SET establishment_id = v_id WHERE id = v_uid;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (v_uid, 'school_admin'::app_role, v_uid)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'establishment_id', v_id, 'referral_code', upper(v_code));
END;
$$;
REVOKE ALL ON FUNCTION public.register_establishment(text, text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_establishment(text, text, text, text, text, text) TO authenticated;

-- =========================
-- 9. Reusable stats functions
-- =========================
CREATE OR REPLACE FUNCTION public.establishment_results(p_establishment_id uuid)
RETURNS TABLE (
  student_id uuid, student_name text, class_id uuid, class_name text,
  subject_id uuid, subject_name text, exam_id uuid, exam_title text,
  score numeric, possible numeric, percent numeric, completed_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_establishment_admin(auth.uid(), p_establishment_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT s.id, s.full_name, s.class_id, c.display_name,
         e.subject_id, sub.name_fr, e.id, e.title,
         COALESCE(ue.total_score, ue.mcq_score::numeric, 0),
         COALESCE(NULLIF(ue.total_possible, 0), NULLIF(ue.mcq_total, 0)::numeric, 20),
         ROUND(100 * COALESCE(ue.total_score, ue.mcq_score::numeric, 0)
               / GREATEST(COALESCE(NULLIF(ue.total_possible, 0), NULLIF(ue.mcq_total, 0)::numeric, 20), 1), 1),
         COALESCE(ue.completed_at, ue.created_at)
  FROM public.establishment_students s
  JOIN public.user_evaluations ue ON ue.user_id = s.user_id
  JOIN public.exams e ON e.id = ue.exam_id
  LEFT JOIN public.classes c ON c.id = s.class_id
  LEFT JOIN public.subjects sub ON sub.id = e.subject_id
  WHERE s.establishment_id = p_establishment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.establishment_results(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.establishment_results(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.establishment_student_activity(p_establishment_id uuid)
RETURNS TABLE (
  student_id uuid, student_name text, class_id uuid,
  lesson_id uuid, lesson_title text, subject_name text,
  status text, progress_percent integer, time_spent_seconds integer, last_viewed_at timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_establishment_admin(auth.uid(), p_establishment_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT s.id, s.full_name, s.class_id, l.id, l.title, sub.name_fr,
         lp.status, lp.progress_percent, lp.time_spent_seconds, lp.last_viewed_at
  FROM public.establishment_students s
  JOIN public.lesson_progress lp ON lp.user_id = s.user_id
  JOIN public.lessons l ON l.id = lp.lesson_id
  LEFT JOIN public.subjects sub ON sub.id = l.subject_id
  WHERE s.establishment_id = p_establishment_id;
END;
$$;
REVOKE ALL ON FUNCTION public.establishment_student_activity(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.establishment_student_activity(uuid) TO authenticated, service_role;

-- =========================
-- 10. Realtime for revenue
-- =========================
ALTER TABLE public.establishment_commissions REPLICA IDENTITY FULL;
ALTER TABLE public.establishment_payouts REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.establishment_commissions;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.establishment_payouts;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;