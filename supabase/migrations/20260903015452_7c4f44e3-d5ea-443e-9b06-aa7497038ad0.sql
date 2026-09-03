-- Proposal only: do not apply without the separately approved remote runbook.
-- Connects an application to an owner-matched resume and preserves posting facts.
BEGIN;

ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_id_user_id_key UNIQUE (id, user_id);

ALTER TABLE public.job_applications
  ADD COLUMN resume_id uuid,
  ADD COLUMN next_action text,
  ADD COLUMN next_action_due date,
  ADD COLUMN job_title_snapshot text,
  ADD COLUMN company_name_snapshot text,
  ADD COLUMN source_snapshot text,
  ADD COLUMN source_url_snapshot text,
  ADD COLUMN location_snapshot text,
  ADD COLUMN deadline_snapshot date,
  ADD COLUMN external_id_snapshot text;

-- Backfill all durable facts that exist today. This is intentionally written
-- even though every current row has a posting, so the migration remains
-- reviewable against the preflight counts.
UPDATE public.job_applications AS application
SET job_title_snapshot = posting.title,
    company_name_snapshot = COALESCE(posting.company_name, posting.department),
    source_snapshot = posting.source,
    source_url_snapshot = posting.source_url,
    location_snapshot = posting.location,
    deadline_snapshot = posting.application_deadline,
    external_id_snapshot = posting.external_id
FROM public.job_postings AS posting
WHERE posting.id = application.job_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.job_applications
    WHERE job_id IS NOT NULL
      AND NULLIF(btrim(job_title_snapshot), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'application snapshot backfill incomplete';
  END IF;
END
$$;

ALTER TABLE public.job_applications
  ADD CONSTRAINT job_applications_next_action_check
    CHECK (next_action IS NULL OR NULLIF(btrim(next_action), '') IS NOT NULL),
  ADD CONSTRAINT job_applications_next_action_due_check
    CHECK (next_action_due IS NULL OR NULLIF(btrim(next_action), '') IS NOT NULL),
  ADD CONSTRAINT job_applications_resume_owner_fkey
    FOREIGN KEY (resume_id, applicant_id)
    REFERENCES public.resumes (id, user_id)
    ON DELETE SET NULL (resume_id);

CREATE INDEX job_applications_resume_id_idx
  ON public.job_applications (resume_id)
  WHERE resume_id IS NOT NULL;

ALTER TABLE public.job_applications
  ALTER COLUMN job_id DROP NOT NULL,
  DROP CONSTRAINT job_applications_job_id_fkey,
  ADD CONSTRAINT job_applications_job_id_fkey
    FOREIGN KEY (job_id)
    REFERENCES public.job_postings (id)
    ON DELETE SET NULL,
  ADD CONSTRAINT job_applications_identity_snapshot_check
    CHECK (job_id IS NOT NULL OR NULLIF(btrim(job_title_snapshot), '') IS NOT NULL);

COMMENT ON COLUMN public.job_applications.next_action IS
  'Optional user-authored next step. NULL means no explicit next action.';
COMMENT ON COLUMN public.job_applications.next_action_due IS
  'Optional due date; permitted only when next_action is non-empty.';
COMMENT ON CONSTRAINT job_applications_resume_owner_fkey ON public.job_applications IS
  'Ensures an attached resume belongs to the application applicant.';
COMMIT;