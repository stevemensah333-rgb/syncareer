-- READ ONLY. Run in Lovable Cloud SQL editor immediately before any separately
-- approved apply. Every result must match docs/MIGRATION_PROPOSAL_APPLICATION_JOURNEY.md.
BEGIN TRANSACTION READ ONLY;

SELECT current_setting('server_version') AS postgres_version;

SELECT conrelid::regclass AS table_name, conname, contype,
       pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid IN (
  'public.job_applications'::regclass,
  'public.saved_jobs'::regclass,
  'public.resumes'::regclass,
  'public.mock_interviews'::regclass
)
ORDER BY 1, 2;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('job_applications', 'saved_jobs', 'resumes', 'mock_interviews')
ORDER BY table_name, ordinal_position;

SELECT status, count(*)
FROM public.job_applications
GROUP BY status
ORDER BY status;

SELECT count(*) AS application_count FROM public.job_applications;
SELECT count(*) AS saved_job_count FROM public.saved_jobs;
SELECT count(*) AS resume_count FROM public.resumes;
SELECT count(*) AS interview_count FROM public.mock_interviews;
SELECT count(*) AS posting_count FROM public.job_postings;

SELECT count(*) AS applications_without_posting
FROM public.job_applications AS application
LEFT JOIN public.job_postings AS posting ON posting.id = application.job_id
WHERE posting.id IS NULL;

SELECT count(*) AS applications_without_title
FROM public.job_applications AS application
JOIN public.job_postings AS posting ON posting.id = application.job_id
WHERE NULLIF(btrim(posting.title), '') IS NULL;

SELECT count(*) AS saved_jobs_without_user
FROM public.saved_jobs AS saved
LEFT JOIN auth.users AS owner ON owner.id = saved.user_id
WHERE owner.id IS NULL;

SELECT count(*) AS saved_jobs_without_posting
FROM public.saved_jobs AS saved
LEFT JOIN public.job_postings AS posting ON posting.id = saved.job_id
WHERE posting.id IS NULL;

SELECT version, name
FROM supabase_migrations.schema_migrations
ORDER BY version DESC
LIMIT 10;

SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'job_postings'
  AND indexdef ILIKE '%external_id%'
ORDER BY indexname;

SELECT tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('job_applications', 'saved_jobs', 'resumes', 'mock_interviews')
ORDER BY tablename, policyname;

ROLLBACK;
