CREATE UNIQUE INDEX IF NOT EXISTS job_postings_external_id_key ON public.job_postings (external_id);
DROP INDEX IF EXISTS public.idx_job_postings_external_id;