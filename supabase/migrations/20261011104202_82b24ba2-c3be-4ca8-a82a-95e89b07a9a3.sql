ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS series_ids uuid[] NOT NULL DEFAULT '{}';
CREATE OR REPLACE FUNCTION public.sync_lesson_series() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' THEN
  IF cardinality(NEW.series_ids)=0 AND NEW.series_id IS NOT NULL THEN NEW.series_ids:=ARRAY[NEW.series_id]; END IF;
 ELSIF NEW.series_ids IS NOT DISTINCT FROM OLD.series_ids AND NEW.series_id IS DISTINCT FROM OLD.series_id THEN
  NEW.series_ids:=CASE WHEN NEW.series_id IS NULL THEN '{}'::uuid[] ELSE ARRAY[NEW.series_id] END;
 END IF;
 NEW.series_id:=NEW.series_ids[1]; RETURN NEW;
END $$;
CREATE TRIGGER sync_lesson_series_before_write BEFORE INSERT OR UPDATE OF series_id,series_ids ON public.lessons FOR EACH ROW EXECUTE FUNCTION public.sync_lesson_series();
CREATE OR REPLACE FUNCTION public.validate_challenge_dates() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$ BEGIN
 IF TG_OP='INSERT' OR NEW.starts_at IS DISTINCT FROM OLD.starts_at OR NEW.ends_at IS DISTINCT FROM OLD.ends_at THEN
  IF NEW.starts_at IS NOT NULL AND NEW.ends_at<=NEW.starts_at THEN RAISE EXCEPTION 'La date de fin doit être postérieure à la date de début.'; END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER validate_challenge_dates_before_write BEFORE INSERT OR UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.validate_challenge_dates();
CREATE OR REPLACE FUNCTION public.notify_challenge_review() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE recipient uuid; lang text; BEGIN
 IF NEW.review_status IS DISTINCT FROM OLD.review_status AND NEW.review_status IN ('approved','rejected') AND NEW.establishment_id IS NOT NULL THEN
  SELECT owner_id INTO recipient FROM public.establishments WHERE id=NEW.establishment_id;
  IF recipient IS NOT NULL THEN
   SELECT preferred_language INTO lang FROM public.profiles WHERE id=recipient;
   PERFORM public.send_notification(recipient,
    CASE WHEN lang='en' THEN CASE WHEN NEW.review_status='approved' THEN 'Challenge approved' ELSE 'Challenge review' END ELSE CASE WHEN NEW.review_status='approved' THEN 'Challenge validé' ELSE 'Retour sur votre challenge' END END,
    CASE WHEN lang='en' THEN 'Your challenge “'||NEW.title||'” has been '||CASE WHEN NEW.review_status='approved' THEN 'approved.' ELSE 'declined. '||coalesce(NEW.review_note,'') END ELSE 'Votre challenge « '||NEW.title||' » a été '||CASE WHEN NEW.review_status='approved' THEN 'validé.' ELSE 'refusé. '||coalesce(NEW.review_note,'') END END,
    'admin_message','normal','{}'::jsonb,'/school?tab=challenges');
  END IF;
 END IF; RETURN NEW;
END $$;
CREATE TRIGGER notify_challenge_review_after_write AFTER UPDATE ON public.challenges FOR EACH ROW EXECUTE FUNCTION public.notify_challenge_review();
REVOKE EXECUTE ON FUNCTION public.sync_lesson_series(),public.validate_challenge_dates(),public.notify_challenge_review() FROM PUBLIC,anon,authenticated;
CREATE POLICY "Challenge PDFs staff read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='challenge-documents' AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1]=auth.uid()::text));
CREATE POLICY "Challenge PDFs staff upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='challenge-documents' AND (storage.foldername(name))[1]=auth.uid()::text AND lower(storage.extension(name))='pdf' AND (public.is_admin(auth.uid()) OR EXISTS (SELECT 1 FROM public.establishments e WHERE e.approval_status='approved' AND public.is_establishment_admin(auth.uid(),e.id))));
CREATE POLICY "Challenge PDFs staff delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='challenge-documents' AND (public.is_admin(auth.uid()) OR (storage.foldername(name))[1]=auth.uid()::text));