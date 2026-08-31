-- Rollback for 20260831120000_mentor_request_service.sql.
-- Run only before the mentor-request feature accepts production traffic.
DROP VIEW IF EXISTS public.mentor_profiles_public;
DO $$ BEGIN PERFORM cron.unschedule('process-mentorship-email-outbox'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP TRIGGER IF EXISTS mentorship_email_outbox_kick ON public.mentorship_email_outbox;
DROP FUNCTION IF EXISTS public.kick_mentorship_email_outbox();
DROP TRIGGER IF EXISTS invalidate_mentor_verification_email ON auth.users;
DROP FUNCTION IF EXISTS public.invalidate_mentor_verification_on_email_change();
DROP FUNCTION IF EXISTS public.get_mentorship_request_context(uuid);
DROP FUNCTION IF EXISTS public.get_admin_mentor_verifications();
DROP FUNCTION IF EXISTS public.update_my_mentor_profile(text,text,text,text[],integer,text);
DROP FUNCTION IF EXISTS public.get_my_mentor_profile();
DROP FUNCTION IF EXISTS public.get_my_mentorship_requests();
DROP FUNCTION IF EXISTS public.list_mentor_profiles();
DROP FUNCTION IF EXISTS public.admin_mentor_verification(uuid,text,text,text);
DROP FUNCTION IF EXISTS public.update_mentorship_request_status(uuid,text);
DROP FUNCTION IF EXISTS public.respond_to_mentorship_request(uuid,text);
DROP FUNCTION IF EXISTS public.create_mentorship_request(uuid,text,text,text,date,text,uuid,uuid);
DROP FUNCTION IF EXISTS public.submit_mentor_verification(text);
DROP TABLE IF EXISTS public.mentorship_email_outbox;
DROP TABLE IF EXISTS public.mentorship_requests;
DROP TABLE IF EXISTS public.mentor_verifications;
ALTER TABLE public.counsellor_details
  DROP COLUMN IF EXISTS current_role,
  DROP COLUMN IF EXISTS expertise_tags,
  DROP COLUMN IF EXISTS years_experience,
  DROP COLUMN IF EXISTS availability_status;

-- The forward migration makes legacy phone fields nullable so new mentors do
-- not have to supply phone contact. This rollback deliberately does not restore
-- NOT NULL: rows created after cutover may contain NULL. Backfill those fields
-- before restoring the old constraints if the legacy scheduler is reactivated.
