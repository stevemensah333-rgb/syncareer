DROP POLICY IF EXISTS "Users can insert own counsellor details" ON public.counsellor_details;
CREATE POLICY "Users can insert own counsellor details"
ON public.counsellor_details
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.get_profile_user_type(auth.uid()) = 'career_counsellor'
);