CREATE OR REPLACE FUNCTION public.current_establishment_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT COALESCE(
    (SELECT establishment_id FROM public.profiles WHERE id = auth.uid()),
    (SELECT establishment_id FROM public.establishment_students WHERE user_id = auth.uid() AND status = 'active' ORDER BY joined_at DESC LIMIT 1)
  );
$$;