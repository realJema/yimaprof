REVOKE EXECUTE ON FUNCTION public.current_establishment_id() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_establishment_admin(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_establishment_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_establishment_admin(uuid, uuid) TO authenticated, service_role;