
-- Security definer helper to read existing user_type without triggering RLS
CREATE OR REPLACE FUNCTION public.get_profile_user_type(_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_type FROM public.profiles WHERE id = _id;
$$;

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    public.get_profile_user_type(auth.uid()) IS NULL
    OR user_type IS NOT DISTINCT FROM public.get_profile_user_type(auth.uid())
  )
);
