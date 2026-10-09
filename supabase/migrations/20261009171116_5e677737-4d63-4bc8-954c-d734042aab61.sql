CREATE OR REPLACE FUNCTION public.find_affiliate_by_username(_username text)
RETURNS TABLE(id uuid, username text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND lower(p.username) = lower(trim(COALESCE(_username, '')))
    AND length(trim(COALESCE(_username, ''))) BETWEEN 2 AND 50
    AND (EXISTS (SELECT 1 FROM public.affiliate_applications a WHERE a.user_id = p.id AND a.status = 'approved')
      OR EXISTS (SELECT 1 FROM public.establishments e WHERE e.owner_id = p.id AND e.approval_status = 'approved' AND e.is_active))
  LIMIT 1;
$$;
CREATE OR REPLACE FUNCTION public.search_affiliate_usernames(_term text)
RETURNS TABLE(id uuid, username text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.username FROM public.profiles p
  WHERE p.username IS NOT NULL
    AND length(trim(COALESCE(_term, ''))) >= 2
    AND p.username ILIKE '%' || trim(_term) || '%'
    AND (EXISTS (SELECT 1 FROM public.affiliate_applications a WHERE a.user_id = p.id AND a.status = 'approved')
      OR EXISTS (SELECT 1 FROM public.establishments e WHERE e.owner_id = p.id AND e.approval_status = 'approved' AND e.is_active))
  ORDER BY p.username LIMIT 10;
$$;