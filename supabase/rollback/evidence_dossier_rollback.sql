-- Rollback for 20260903000000_evidence_dossier.sql
--
-- Reverses the evidence dossier foundation. Run top-to-bottom in a single
-- transaction on a disposable restore; it has never been applied to the
-- production project as part of this rollback's own approval.
--
-- Job applications that received an application-scoped CV keep their
-- job_applications.resume_id value if that column predates the evidence
-- migration (the application-workspace migration owns it); the column is only
-- dropped here when the evidence migration was the thing that introduced it.
-- Cloned application CVs become ordinary rows again (document_scope falls
-- back to 'base'); their data is preserved, not deleted.

BEGIN;

DROP FUNCTION IF EXISTS
  public.unlink_evidence_from_resume_entry(uuid, uuid, text, text),
  public.link_evidence_to_resume_entry(uuid, uuid, text, text),
  public.unlink_evidence_from_requirement(uuid, uuid),
  public.link_evidence_to_requirement(uuid, uuid, text),
  public.remove_evidence_source(uuid),
  public.add_evidence_source(uuid, text, text, text, text, text, uuid, uuid),
  public.archive_evidence_item(uuid),
  public.confirm_evidence_item(uuid),
  public.update_evidence_item(uuid, text, text, text, date),
  public.create_evidence_item(text, text, text, date),
  public.create_application_cv(uuid, uuid),
  public.remove_application_requirement(uuid),
  public.add_manual_application_requirement(uuid, text, text),
  public.initialize_application_requirements(uuid);

DROP TRIGGER IF EXISTS resumes_application_cv_exclusive ON public.resumes;
DROP TRIGGER IF EXISTS job_applications_application_cv_exclusive ON public.job_applications;
DROP FUNCTION IF EXISTS public.enforce_application_cv_exclusive_link();

DROP TABLE IF EXISTS public.resume_evidence_links;
DROP TABLE IF EXISTS public.application_evidence_links;
DROP TABLE IF EXISTS public.application_requirements;
DROP TABLE IF EXISTS public.evidence_sources;
DROP TABLE IF EXISTS public.evidence_items;

DROP INDEX IF EXISTS public.resumes_document_scope_idx;

-- document_scope/source_resume_id are dropped; cloned CVs survive as plain
-- rows and existing job_applications.resume_id links remain valid pointers to
-- them (that column carries no foreign key). No application data is deleted.

ALTER TABLE public.resumes
  DROP COLUMN IF EXISTS source_resume_id,
  DROP COLUMN IF EXISTS document_scope;

-- Only drop the composite ownership constraints this migration re-asserts
-- when no other object depends on them. The two pre-existing ones (resumes,
-- job_applications) are owned by the application-workspace migrations and are
-- intentionally left in place.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mock_interviews_id_user_id_key'
      AND conrelid = 'public.mock_interviews'::regclass
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE confrelid = 'public.mock_interviews'::regclass
      AND conname <> 'mock_interviews_id_user_id_key'
  ) THEN
    ALTER TABLE public.mock_interviews DROP CONSTRAINT mock_interviews_id_user_id_key;
  END IF;
END $$;

COMMIT;
