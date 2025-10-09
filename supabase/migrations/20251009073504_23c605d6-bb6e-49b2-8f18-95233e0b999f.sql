-- Drop the insecure audit log insert policy
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create a secure policy that only allows service role to insert audit logs
CREATE POLICY "Only service role can insert audit logs"
ON public.audit_logs
FOR INSERT
TO service_role
WITH CHECK (true);

-- Optional: Create a security definer function for controlled audit log insertion
-- This allows application code to log audits through a controlled interface
CREATE OR REPLACE FUNCTION public.log_audit(
  p_action text,
  p_target_type text,
  p_target_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id uuid;
BEGIN
  INSERT INTO public.audit_logs (
    actor_id,
    action,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    auth.uid(),
    p_action,
    p_target_type,
    p_target_id,
    p_metadata,
    now()
  )
  RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;