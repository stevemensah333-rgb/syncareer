-- Update employment_type constraint to include 'remote'
ALTER TABLE public.job_postings DROP CONSTRAINT IF EXISTS job_postings_employment_type_check;
ALTER TABLE public.job_postings ADD CONSTRAINT job_postings_employment_type_check 
  CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship', 'remote'));