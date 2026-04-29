
-- Revoke EXECUTE on internal trigger functions and admin migration helper from public roles.
-- These are invoked by triggers (run as table owner) or admins via service role; they should not be
-- callable directly by anon/authenticated clients via PostgREST RPC.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_notification_prefs() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.initialize_user_stats() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_learning_streak() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.generate_referral_code() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.migrate_skills_to_relational() FROM anon, authenticated, PUBLIC;
