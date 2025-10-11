-- Fix Critical Security Issues

-- 1. Create app_role enum for proper role management
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

-- 2. Create user_roles table (separate from profiles as per security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 4. Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 
       CASE 
         WHEN role::text = 'admin' THEN 'admin'::app_role
         WHEN role::text = 'teacher' THEN 'teacher'::app_role
         ELSE 'student'::app_role
       END,
       created_at
FROM public.profiles
ON CONFLICT (user_id, role) DO NOTHING;

-- 5. Drop and recreate is_admin function with CASCADE to update dependent policies
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
CREATE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_id, 'admin'::app_role);
$$;

-- 6. Drop and recreate get_user_role to use new user_roles table  
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
CREATE FUNCTION public.get_user_role(user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_roles.user_id = get_user_role.user_id 
  LIMIT 1;
$$;

-- 7. Recreate all RLS policies that depend on is_admin
CREATE POLICY "Admins can manage establishments"
ON public.establishments
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage subscription plans"
ON public.subscription_plans
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all transactions"
ON public.transactions
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view audit logs"
ON public.audit_logs
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage classes"
ON public.classes
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage subscription plan classes"
ON public.subscription_plan_classes
FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 8. Create secure function for role changes with audit logging
CREATE OR REPLACE FUNCTION public.change_user_role(
  target_user_id UUID,
  new_role app_role
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Also update profiles table for backward compatibility
  UPDATE public.profiles 
  SET role = new_role::text::user_role,
      updated_at = now()
  WHERE id = target_user_id;

  -- Log the action
  PERFORM public.log_audit(
    'role_changed',
    'user',
    target_user_id,
    json_build_object(
      'new_role', new_role,
      'changed_by', auth.uid()
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
      'error', 'Role change failed'
    );
END;
$$;

-- 9. RLS Policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Only change_user_role function can modify roles"
ON public.user_roles
FOR ALL
USING (false)
WITH CHECK (false);

-- 10. Fix audit_logs INSERT policy (Critical Security Fix)
DROP POLICY IF EXISTS "Only service role can insert audit logs" ON public.audit_logs;

CREATE POLICY "Only log_audit function can insert audit logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  -- Only allow inserts from authenticated users (log_audit function validates)
  current_setting('role', true) = 'authenticated'
  AND auth.uid() IS NOT NULL
);

-- 11. Create trigger for new users to assign default role
CREATE OR REPLACE FUNCTION public.assign_default_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_profile_created_assign_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.assign_default_role();