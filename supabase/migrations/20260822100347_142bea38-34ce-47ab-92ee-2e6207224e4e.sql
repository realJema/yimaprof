ALTER TABLE public.establishments
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

UPDATE public.establishments SET approval_status = 'approved', approved_at = COALESCE(approved_at, now())
WHERE approval_status = 'pending';

CREATE OR REPLACE FUNCTION public.validate_establishment_approval_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.approval_status NOT IN ('pending', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid approval_status: %', NEW.approval_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_establishment_approval ON public.establishments;
CREATE TRIGGER validate_establishment_approval
BEFORE INSERT OR UPDATE ON public.establishments
FOR EACH ROW EXECUTE FUNCTION public.validate_establishment_approval_status();

REVOKE ALL ON FUNCTION public.validate_establishment_approval_status() FROM anon, authenticated;

-- School admins only get write access once their establishment is approved
CREATE OR REPLACE FUNCTION public.is_establishment_admin(_user_id uuid, _establishment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::app_role)
    OR (
      public.has_role(_user_id, 'school_admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = _user_id AND p.establishment_id = _establishment_id
      )
      AND EXISTS (
        SELECT 1 FROM public.establishments e
        WHERE e.id = _establishment_id AND e.approval_status = 'approved'
      )
    );
$$;

-- Registration keeps the school pending
CREATE OR REPLACE FUNCTION public.register_establishment(p_name text, p_type text DEFAULT 'private'::text, p_city text DEFAULT NULL::text, p_country text DEFAULT 'CM'::text, p_contact_email text DEFAULT NULL::text, p_contact_phone text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  INSERT INTO public.establishments (name, type, country, city, contact_email, contact_phone, owner_id, referral_code, approval_status)
  VALUES (trim(left(p_name, 150)), coalesce(p_type, 'private'), coalesce(p_country, 'CM'),
          left(p_city, 100), left(p_contact_email, 255), left(p_contact_phone, 30), v_uid, upper(v_code), 'pending')
  RETURNING id INTO v_id;

  UPDATE public.profiles SET establishment_id = v_id WHERE id = v_uid;

  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (v_uid, 'school_admin'::app_role, v_uid)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN json_build_object('success', true, 'establishment_id', v_id, 'referral_code', upper(v_code), 'approval_status', 'pending');
END;
$$;

-- Admin: approve / reject / reset an establishment
CREATE OR REPLACE FUNCTION public.admin_set_establishment_approval(p_establishment_id uuid, p_status text, p_reason text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid; v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;
  IF p_status NOT IN ('pending', 'approved', 'rejected') THEN
    RETURN json_build_object('success', false, 'error', 'Invalid status');
  END IF;

  UPDATE public.establishments
  SET approval_status = p_status,
      approved_at = CASE WHEN p_status = 'approved' THEN now() ELSE NULL END,
      approved_by = CASE WHEN p_status = 'approved' THEN auth.uid() ELSE NULL END,
      rejection_reason = CASE WHEN p_status = 'rejected' THEN p_reason ELSE NULL END,
      is_active = CASE WHEN p_status = 'approved' THEN true ELSE is_active END,
      updated_at = now()
  WHERE id = p_establishment_id
  RETURNING owner_id, name INTO v_owner, v_name;

  IF v_name IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'School not found');
  END IF;

  IF v_owner IS NOT NULL THEN
    PERFORM public.send_notification(
      v_owner,
      CASE WHEN p_status = 'approved' THEN 'Établissement approuvé'
           WHEN p_status = 'rejected' THEN 'Inscription refusée'
           ELSE 'Établissement en attente' END,
      CASE WHEN p_status = 'approved' THEN v_name || ' est approuvé. Vous avez maintenant accès à toutes les fonctionnalités.'
           WHEN p_status = 'rejected' THEN coalesce(p_reason, 'Votre inscription a été refusée.')
           ELSE v_name || ' est en attente de validation.' END,
      'system', 'high', '{}'::jsonb, '/school');
  END IF;

  PERFORM public.log_audit('establishment_approval_changed', 'establishments', p_establishment_id,
    jsonb_build_object('status', p_status));

  RETURN json_build_object('success', true);
END;
$$;

-- Admin: link a user (by email) to an establishment
CREATE OR REPLACE FUNCTION public.admin_link_user_to_establishment(p_email text, p_establishment_id uuid, p_make_owner boolean DEFAULT false, p_grant_school_admin boolean DEFAULT true)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  SELECT id INTO v_uid FROM public.profiles WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
  IF v_uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'No user found with this email');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.establishments WHERE id = p_establishment_id) THEN
    RETURN json_build_object('success', false, 'error', 'School not found');
  END IF;

  UPDATE public.profiles SET establishment_id = p_establishment_id, updated_at = now() WHERE id = v_uid;

  IF p_make_owner THEN
    UPDATE public.establishments SET owner_id = v_uid, updated_at = now() WHERE id = p_establishment_id;
  END IF;

  IF p_grant_school_admin THEN
    INSERT INTO public.user_roles (user_id, role, created_by)
    VALUES (v_uid, 'school_admin'::app_role, auth.uid())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  PERFORM public.log_audit('establishment_user_linked', 'establishments', p_establishment_id,
    jsonb_build_object('user_id', v_uid, 'owner', p_make_owner));

  RETURN json_build_object('success', true, 'user_id', v_uid);
END;
$$;

-- Admin: unlink a user from an establishment
CREATE OR REPLACE FUNCTION public.admin_unlink_user_from_establishment(p_user_id uuid, p_establishment_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN json_build_object('success', false, 'error', 'Not authorized');
  END IF;

  UPDATE public.profiles SET establishment_id = NULL, updated_at = now()
  WHERE id = p_user_id AND establishment_id = p_establishment_id;

  UPDATE public.establishments SET owner_id = NULL, updated_at = now()
  WHERE id = p_establishment_id AND owner_id = p_user_id;

  DELETE FROM public.user_roles WHERE user_id = p_user_id AND role = 'school_admin'::app_role;

  PERFORM public.log_audit('establishment_user_unlinked', 'establishments', p_establishment_id,
    jsonb_build_object('user_id', p_user_id));

  RETURN json_build_object('success', true);
END;
$$;

-- Admin: list users attached to an establishment
CREATE OR REPLACE FUNCTION public.admin_list_establishment_users(p_establishment_id uuid)
RETURNS TABLE(id uuid, email text, first_name text, last_name text, is_owner boolean, is_school_admin boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.first_name, p.last_name,
         (e.owner_id = p.id) AS is_owner,
         EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = p.id AND ur.role = 'school_admin'::app_role) AS is_school_admin
  FROM public.profiles p
  JOIN public.establishments e ON e.id = p_establishment_id
  WHERE p.establishment_id = p_establishment_id
    AND public.has_role(auth.uid(), 'admin'::app_role);
$$;

REVOKE ALL ON FUNCTION public.admin_set_establishment_approval(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.admin_link_user_to_establishment(text, uuid, boolean, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.admin_unlink_user_from_establishment(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_list_establishment_users(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_set_establishment_approval(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_link_user_to_establishment(text, uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_unlink_user_from_establishment(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_establishment_users(uuid) TO authenticated;