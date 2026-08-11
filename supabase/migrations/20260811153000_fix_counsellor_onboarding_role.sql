-- Align counsellor onboarding with the canonical application role value.
--
-- The application, signup metadata, route guards, and analytics use
-- `career_counsellor`. The existing INSERT policy checks the obsolete value
-- `counsellor`, which prevents a correctly provisioned career counsellor from
-- creating their own contact row during onboarding.
--
-- This preserves the existing ownership and profile-role checks. It does not
-- permit users to assign or change their profile role.

DROP POLICY IF EXISTS "Users can insert own counsellor details"
  ON public.counsellor_details;

CREATE POLICY "Users can insert own counsellor details"
  ON public.counsellor_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.get_profile_user_type(auth.uid()) = 'career_counsellor'
  );
