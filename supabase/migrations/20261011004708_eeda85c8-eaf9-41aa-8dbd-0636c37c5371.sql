CREATE POLICY "Admins manage all challenges" ON public.challenges FOR ALL TO authenticated
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_challenge_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.establishment_id IS NOT NULL THEN NEW.review_status := 'pending'; NEW.review_note := NULL; END IF;
  ELSE
    NEW.review_status := OLD.review_status;
    NEW.review_note := OLD.review_note;
    NEW.questions := OLD.questions;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.enforce_challenge_review() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_enforce_challenge_review ON public.challenges;
CREATE TRIGGER trg_enforce_challenge_review BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.enforce_challenge_review();