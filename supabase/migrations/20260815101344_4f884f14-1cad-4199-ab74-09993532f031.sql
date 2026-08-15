-- 1. affiliate_earnings: remove open insert
DROP POLICY IF EXISTS "System can insert earnings" ON public.affiliate_earnings;

-- 2. ai_usage_logs: remove open insert
DROP POLICY IF EXISTS "Edge functions can insert" ON public.ai_usage_logs;

-- 3. profiles: remove full-row exposure to all authenticated users
DROP POLICY IF EXISTS "Authenticated users can search usernames" ON public.profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE(id uuid, username text, first_name text, last_name text, profile_photo_url text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username, p.first_name, p.last_name, p.profile_photo_url
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = ANY(COALESCE(_ids, ARRAY[]::uuid[]))
  LIMIT 500;
$$;

CREATE OR REPLACE FUNCTION public.find_affiliate_by_username(_username text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username
  FROM public.profiles p
  JOIN public.affiliate_applications a ON a.user_id = p.id AND a.status = 'approved'
  WHERE p.username IS NOT NULL
    AND lower(p.username) = lower(trim(COALESCE(_username, '')))
    AND length(trim(COALESCE(_username, ''))) BETWEEN 2 AND 50
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_affiliate_usernames(_term text)
RETURNS TABLE(id uuid, username text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.username
  FROM public.profiles p
  JOIN public.affiliate_applications a ON a.user_id = p.id AND a.status = 'approved'
  WHERE p.username IS NOT NULL
    AND length(trim(COALESCE(_term, ''))) >= 2
    AND p.username ILIKE '%' || trim(_term) || '%'
  ORDER BY p.username
  LIMIT 10;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.search_affiliate_usernames(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_affiliate_usernames(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.find_affiliate_by_username(text) TO anon, authenticated, service_role;

-- 4. storage: papers bucket uploads restricted to admins
DROP POLICY IF EXISTS "Authenticated users can upload papers" ON storage.objects;

-- 5. search_path hardening
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'fr')
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 6. Revoke direct client EXECUTE on internal / trigger / privileged functions
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'assign_default_role','create_affiliate_commission_on_transaction',
        'create_default_notification_preferences','handle_new_user',
        'notify_payment_completed','trigger_email_notification',
        'update_topic_reply_count','update_updated_at_column',
        'check_subscription_expiry','harmonize_exam_data',
        'send_notification','transition_subscription_plan'
      )
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;

  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('broadcast_notification','change_user_role','get_user_role','log_audit')
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
  END LOOP;
END $$;