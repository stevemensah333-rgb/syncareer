-- Compensating rollback for
-- supabase/migrations/20260811153000_fix_counsellor_onboarding_role.sql.
--
-- Run only through an approved Lovable Cloud database change. This restores
-- the previous policy verbatim; doing so will make canonical
-- `career_counsellor` onboarding fail again and is intended only for emergency
-- rollback while the role contract is investigated.

DROP POLICY IF EXISTS "Users can insert own counsellor details"
  ON public.counsellor_details;

CREATE POLICY "Users can insert own counsellor details"
  ON public.counsellor_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.get_profile_user_type(auth.uid()) = 'counsellor'
  );
