-- Fix change_user_role to use jsonb for log_audit
CREATE OR REPLACE FUNCTION public.change_user_role(target_user_id uuid, new_role app_role)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  admin_count INTEGER;
  result JSON;
BEGIN
  -- Verify caller is admin
  IF NOT public.is_admin(auth.uid()) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;

  -- Prevent removing the last admin
  IF new_role != 'admin'::app_role THEN
    SELECT COUNT(*) INTO admin_count
    FROM public.user_roles
    WHERE role = 'admin'::app_role;
    
    IF admin_count <= 1 AND public.has_role(target_user_id, 'admin'::app_role) THEN
      RETURN json_build_object(
        'success', false,
        'error', 'Cannot remove the last admin'
      );
    END IF;
  END IF;

  -- Remove existing roles for user
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Add new role
  INSERT INTO public.user_roles (user_id, role, created_by)
  VALUES (target_user_id, new_role, auth.uid());

  -- Log the action with proper jsonb type
  PERFORM public.log_audit(
    'role_changed',
    'user',
    target_user_id,
    jsonb_build_object(
      'new_role', new_role::text,
      'changed_by', auth.uid()::text
    )
  );

  result := json_build_object(
    'success', true,
    'message', 'Role updated successfully',
    'new_role', new_role
  );

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Role change failed: ' || SQLERRM
    );
END;
$function$;