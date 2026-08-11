-- Proposal only: do not apply without the separately approved remote runbook.
-- Standalone interviews remain valid because application_id is nullable.
BEGIN;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_id_applicant_id_key UNIQUE (id, applicant_id);

ALTER TABLE public.mock_interviews
  ADD COLUMN application_id uuid,
  ADD CONSTRAINT mock_interviews_application_owner_fkey
    FOREIGN KEY (application_id, user_id)
    REFERENCES public.job_applications (id, applicant_id)
    ON DELETE SET NULL (application_id);

CREATE INDEX mock_interviews_application_id_idx
  ON public.mock_interviews (application_id)
  WHERE application_id IS NOT NULL;

COMMENT ON CONSTRAINT mock_interviews_application_owner_fkey ON public.mock_interviews IS
  'Ensures a linked application belongs to the interview owner.';
COMMIT;
