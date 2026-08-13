CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested_type text := NEW.raw_user_meta_data->>'user_type';
  resolved_type text;
BEGIN
  -- Only the two supported account roles may come from client-supplied
  -- signup metadata; anything else falls back to the least-privileged role.
  resolved_type := CASE
    WHEN requested_type IN ('student', 'career_counsellor') THEN requested_type
    ELSE 'student'
  END;

  INSERT INTO public.profiles (id, username, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'full_name',
    resolved_type
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'job_seeker');

  RETURN NEW;
END;
$function$;

-- Backfill accounts created while the trigger dropped the requested role.
UPDATE public.profiles p
SET user_type = 'career_counsellor'
FROM auth.users u
WHERE u.id = p.id
  AND p.user_type IS NULL
  AND u.raw_user_meta_data->>'user_type' = 'career_counsellor';

UPDATE public.profiles p
SET user_type = 'student'
FROM auth.users u
WHERE u.id = p.id
  AND p.user_type IS NULL
  AND coalesce(u.raw_user_meta_data->>'user_type', 'student') = 'student';