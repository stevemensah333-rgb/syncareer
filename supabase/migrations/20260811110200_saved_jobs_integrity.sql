-- Proposal only: do not apply without the separately approved remote runbook.
-- Live audit expected saved_jobs to contain zero rows; the UPDATE is retained
-- as explicit backfill logic and must affect zero rows at preflight time.
BEGIN;

ALTER TABLE public.saved_jobs
  ADD COLUMN job_title_snapshot text,
  ADD COLUMN company_name_snapshot text,
  ADD COLUMN source_snapshot text,
  ADD COLUMN source_url_snapshot text,
  ADD COLUMN location_snapshot text,
  ADD COLUMN deadline_snapshot date,
  ADD COLUMN external_id_snapshot text;

UPDATE public.saved_jobs AS saved
SET job_title_snapshot = posting.title,
    company_name_snapshot = COALESCE(posting.company_name, posting.department),
    source_snapshot = posting.source,
    source_url_snapshot = posting.source_url,
    location_snapshot = posting.location,
    deadline_snapshot = posting.application_deadline,
    external_id_snapshot = posting.external_id
FROM public.job_postings AS posting
WHERE posting.id = saved.job_id;

ALTER TABLE public.saved_jobs
  ALTER COLUMN job_id DROP NOT NULL,
  ADD CONSTRAINT saved_jobs_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users (id)
    ON DELETE CASCADE,
  ADD CONSTRAINT saved_jobs_job_id_fkey
    FOREIGN KEY (job_id)
    REFERENCES public.job_postings (id)
    ON DELETE SET NULL,
  ADD CONSTRAINT saved_jobs_identity_snapshot_check
    CHECK (job_id IS NOT NULL OR NULLIF(btrim(job_title_snapshot), '') IS NOT NULL);
COMMIT;
