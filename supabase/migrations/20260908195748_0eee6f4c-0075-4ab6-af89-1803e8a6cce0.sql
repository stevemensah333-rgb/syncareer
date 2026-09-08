ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS job_description_snapshot text,
  ADD COLUMN IF NOT EXISTS requirements_snapshot text;

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_job_description_snapshot_length;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_job_description_snapshot_length
  CHECK (job_description_snapshot IS NULL OR char_length(job_description_snapshot) <= 20000);

ALTER TABLE public.job_applications
  DROP CONSTRAINT IF EXISTS job_applications_requirements_snapshot_length;
ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_requirements_snapshot_length
  CHECK (requirements_snapshot IS NULL OR char_length(requirements_snapshot) <= 8000);

COMMENT ON COLUMN public.job_applications.job_description_snapshot IS
  'Posting text captured when the application was created from a pasted job link. Owner-only, like every other snapshot column.';
COMMENT ON COLUMN public.job_applications.requirements_snapshot IS
  'Requirements text captured with job_description_snapshot.';