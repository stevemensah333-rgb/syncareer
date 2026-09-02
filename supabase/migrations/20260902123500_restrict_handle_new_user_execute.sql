-- Reconcile the repository with the already-verified Live permission boundary.
-- This trigger function is invoked by auth.users inserts; browser roles never
-- need to call it directly.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO postgres, service_role;
