-- ISOLATED VERIFIED RESTORE ONLY. Never run against Lovable Live.
-- Requires at least two synthetic auth users and one synthetic job posting.
-- The entire test rolls back.
BEGIN;

DO $$
BEGIN
  IF current_setting('syncareer.test_environment', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'set syncareer.test_environment=true in an isolated test database';
  END IF;
END
$$;

CREATE TEMP TABLE journey_fixture AS
WITH posting AS (
  INSERT INTO public.job_postings
    (title, description, employment_type, location, source, status)
  VALUES
    ('Journey fixture role', 'Synthetic isolated-test posting', 'full_time', 'Test', 'test', 'active')
  RETURNING id
)
SELECT
  (SELECT id FROM auth.users ORDER BY id LIMIT 1) AS user_a,
  (SELECT id FROM auth.users ORDER BY id OFFSET 1 LIMIT 1) AS user_b,
  posting.id AS job_id
FROM posting;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM journey_fixture WHERE user_a IS NULL OR user_b IS NULL OR job_id IS NULL) THEN
    RAISE EXCEPTION 'fixture requires two synthetic users and one posting';
  END IF;
END
$$;

CREATE TEMP TABLE journey_ids (
  resume_a uuid NOT NULL,
  resume_b uuid NOT NULL,
  application_a uuid NOT NULL,
  application_b uuid NOT NULL,
  interview_a uuid NOT NULL,
  saved_a uuid NOT NULL
);

WITH fixture AS (SELECT * FROM journey_fixture),
resume_a AS (
  INSERT INTO public.resumes (user_id, title)
  SELECT user_a, 'Journey test resume A' FROM fixture RETURNING id
),
resume_b AS (
  INSERT INTO public.resumes (user_id, title)
  SELECT user_b, 'Journey test resume B' FROM fixture RETURNING id
),
application_a AS (
  INSERT INTO public.job_applications
    (applicant_id, job_id, status, job_title_snapshot, resume_id, next_action, next_action_due)
  SELECT user_a, job_id, 'pending', 'Journey fixture role', resume_a.id,
         'Tailor resume', current_date + 1
  FROM fixture, resume_a RETURNING id
),
application_b AS (
  INSERT INTO public.job_applications
    (applicant_id, job_id, status, job_title_snapshot)
  SELECT user_b, job_id, 'pending', 'Journey fixture role'
  FROM fixture RETURNING id
),
interview_a AS (
  INSERT INTO public.mock_interviews (user_id, job_role, application_id)
  SELECT user_a, 'Journey fixture role', application_a.id
  FROM fixture, application_a RETURNING id
),
saved_a AS (
  INSERT INTO public.saved_jobs (user_id, job_id, job_title_snapshot)
  SELECT user_a, job_id, 'Journey fixture role' FROM fixture RETURNING id
)
INSERT INTO journey_ids
SELECT resume_a.id, resume_b.id, application_a.id, application_b.id, interview_a.id, saved_a.id
FROM resume_a, resume_b, application_a, application_b, interview_a, saved_a;

DO $$
DECLARE fixture journey_fixture%ROWTYPE; ids journey_ids%ROWTYPE;
BEGIN
  SELECT * INTO fixture FROM journey_fixture;
  SELECT * INTO ids FROM journey_ids;

  BEGIN
    UPDATE public.job_applications
    SET resume_id = ids.resume_b
    WHERE id = ids.application_a;
    RAISE EXCEPTION 'cross-owner resume link unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.mock_interviews
    SET application_id = ids.application_b
    WHERE id = ids.interview_a;
    RAISE EXCEPTION 'cross-owner application/interview link unexpectedly succeeded';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.job_applications
    SET next_action = NULL, next_action_due = current_date
    WHERE id = ids.application_a;
    RAISE EXCEPTION 'due date without next action unexpectedly succeeded';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.job_applications SET resume_id = ids.resume_a WHERE id = ids.application_a;
  UPDATE public.mock_interviews SET application_id = ids.application_a WHERE id = ids.interview_a;

  DELETE FROM public.resumes WHERE id = ids.resume_a;
  IF (SELECT resume_id FROM public.job_applications WHERE id = ids.application_a) IS NOT NULL THEN
    RAISE EXCEPTION 'resume delete did not clear only resume_id';
  END IF;

  DELETE FROM public.job_applications WHERE id = ids.application_a;
  IF (SELECT application_id FROM public.mock_interviews WHERE id = ids.interview_a) IS NOT NULL THEN
    RAISE EXCEPTION 'application delete did not clear only application_id';
  END IF;

  DELETE FROM public.job_postings WHERE id = fixture.job_id;
  IF (SELECT job_id FROM public.job_applications WHERE id = ids.application_b) IS NOT NULL
     OR (SELECT job_title_snapshot FROM public.job_applications WHERE id = ids.application_b) <> 'Journey fixture role' THEN
    RAISE EXCEPTION 'posting delete did not preserve application snapshot';
  END IF;
  IF (SELECT job_id FROM public.saved_jobs WHERE id = ids.saved_a) IS NOT NULL
     OR (SELECT job_title_snapshot FROM public.saved_jobs WHERE id = ids.saved_a) <> 'Journey fixture role' THEN
    RAISE EXCEPTION 'posting delete did not preserve saved-job snapshot';
  END IF;
END
$$;

-- RLS definitions must continue to scope the four owner tables. Composite FKs
-- provide cross-owner integrity even for service-role writes.
DO $$
DECLARE missing text;
BEGIN
  SELECT string_agg(table_name, ', ')
  INTO missing
  FROM (VALUES
    ('job_applications', 'applicant_id'),
    ('resumes', 'user_id'),
    ('mock_interviews', 'user_id'),
    ('saved_jobs', 'user_id')
  ) AS expected(table_name, owner_column)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies policy
    WHERE policy.schemaname = 'public'
      AND policy.tablename = expected.table_name
      AND (COALESCE(policy.qual, '') || COALESCE(policy.with_check, '')) LIKE '%auth.uid()%'
      AND (COALESCE(policy.qual, '') || COALESCE(policy.with_check, '')) LIKE '%' || expected.owner_column || '%'
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'owner-scoped RLS missing for: %', missing;
  END IF;
END
$$;

ROLLBACK;
