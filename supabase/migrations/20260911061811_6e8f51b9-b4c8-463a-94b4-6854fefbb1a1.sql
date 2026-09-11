DROP VIEW IF EXISTS public.establishments_directory;

CREATE OR REPLACE FUNCTION public.establishments_directory()
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  city text,
  country text,
  logo_url text,
  is_active boolean,
  approval_status text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id, e.name, e.type, e.city, e.country, e.logo_url, e.is_active, e.approval_status, e.created_at
  FROM public.establishments e
  WHERE e.is_active = true AND e.approval_status = 'approved'
  ORDER BY e.name
$$;

REVOKE ALL ON FUNCTION public.establishments_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.establishments_directory() TO anon, authenticated, service_role;