
-- Revoke EXECUTE from PUBLIC and anon on all SECURITY DEFINER functions in public schema
DO $$
DECLARE
  fn record;
BEGIN
  FOR fn IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon', fn.proname, fn.args);
  END LOOP;
END $$;

-- Re-grant to authenticated only for functions that clients need to call
GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_has_counsellor_booking(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_counsellor_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_user_type(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_portfolio_settings(uuid) TO authenticated, anon;
