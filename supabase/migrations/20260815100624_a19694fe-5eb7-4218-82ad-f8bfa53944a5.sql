ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS establishment_id uuid REFERENCES public.establishments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lessons_establishment_id_idx ON public.lessons(establishment_id);

DROP POLICY IF EXISTS "School admins manage their lessons" ON public.lessons;
CREATE POLICY "School admins manage their lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (establishment_id IS NOT NULL AND public.is_establishment_admin(auth.uid(), establishment_id))
WITH CHECK (establishment_id IS NOT NULL AND public.is_establishment_admin(auth.uid(), establishment_id));