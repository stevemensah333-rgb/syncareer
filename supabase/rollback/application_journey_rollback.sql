-- COMPENSATING SQL. Do not run automatically or without separate approval.
-- Snapshot and link columns are retained by default to avoid destroying data.
BEGIN;

ALTER TABLE public.mock_interviews
  DROP CONSTRAINT IF EXISTS mock_interviews_application_owner_fkey,
  DROP COLUMN IF EXISTS application_id;
DROP INDEX IF EXISTS public.mock_interviews_application_id_idx;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_resume_owner_fkey,
  DROP CONSTRAINT IF EXISTS job_applications_next_action_check,
  DROP CONSTRAINT IF EXISTS job_applications_next_action_due_check;
DROP INDEX IF EXISTS public.job_applications_resume_id_idx;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_identity_snapshot_check,
  DROP CONSTRAINT IF EXISTS job_applications_job_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.job_applications WHERE job_id IS NULL) THEN
    RAISE EXCEPTION 'rollback refused: detached applications exist; restoring CASCADE/NOT NULL would require relinking or deleting user records';
  END IF;
END
$$;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_job_id_fkey
    FOREIGN KEY (job_id) REFERENCES public.job_postings (id) ON DELETE CASCADE,
  ALTER COLUMN job_id SET NOT NULL;

ALTER TABLE public.saved_jobs
  DROP CONSTRAINT IF EXISTS saved_jobs_identity_snapshot_check,
  DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey,
  DROP CONSTRAINT IF EXISTS saved_jobs_user_id_fkey;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.saved_jobs WHERE job_id IS NULL) THEN
    RAISE EXCEPTION 'rollback refused: detached saved jobs exist; restoring NOT NULL would require relinking or deleting user records';
  END IF;
END
$$;

ALTER TABLE public.saved_jobs ALTER COLUMN job_id SET NOT NULL;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_id_applicant_id_key;
ALTER TABLE public.resumes
  DROP CONSTRAINT IF EXISTS resumes_id_user_id_key;

COMMIT;

-- Deliberately retained because dropping them loses user-authored or historical data:
-- job_applications.resume_id, next_action, next_action_due, and all snapshot columns;
-- saved_jobs snapshot columns. Drop them only after a separate data-retention decision.
