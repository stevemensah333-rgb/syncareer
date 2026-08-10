-- Add a unique constraint on job_postings.external_id so the external job
-- aggregation function can use bulk upsert without duplicates. The column
-- already exists and is populated by the aggregate-external-jobs edge
-- function; employer-posted jobs leave it NULL. Postgres treats NULLs as
-- distinct in a UNIQUE index, so NULLs never conflict.

CREATE UNIQUE INDEX IF NOT EXISTS job_postings_external_id_key
  ON public.job_postings (external_id)
  WHERE external_id IS NOT NULL;
