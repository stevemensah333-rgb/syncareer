-- Find and drop the FK constraint on job_postings.employer_id
ALTER TABLE public.job_postings DROP CONSTRAINT IF EXISTS job_postings_employer_id_fkey;