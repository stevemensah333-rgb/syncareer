-- Initialize a missing profile from the role explicitly selected at signup.
--
-- The browser cannot insert a privileged profile role because profiles.user_type
-- is immutable and self-service INSERT is limited to NULL/student. This
-- security-definer RPC keeps that boundary intact while making signup recovery
-- idempotent for both new and previously affected accounts.
CREATE OR REPLACE FUNCTION public.initialize_my_profile_from_auth_metadata()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  metadata_role text;
  metadata_name text;
  existing_role text;
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to initialize a profile';
  END IF;

  SELECT user_type
    INTO existing_role
    FROM public.profiles
   WHERE id = current_user_id;

  IF FOUND THEN
    RETURN existing_role;
  END IF;

  SELECT
    NULLIF(TRIM(COALESCE(raw_user_meta_data ->> 'user_type', '')), ''),
    NULLIF(TRIM(COALESCE(raw_user_meta_data ->> 'full_name', '')), '')
    INTO metadata_role, metadata_name
    FROM auth.users
   WHERE id = current_user_id;

  IF metadata_role IS NULL OR metadata_role NOT IN ('student', 'career_counsellor') THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, user_type, onboarding_completed)
  VALUES (current_user_id, metadata_name, metadata_role, false)
  ON CONFLICT (id) DO NOTHING;

  SELECT user_type
    INTO existing_role
    FROM public.profiles
   WHERE id = current_user_id;

  RETURN existing_role;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.initialize_my_profile_from_auth_metadata() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.initialize_my_profile_from_auth_metadata() TO authenticated;
