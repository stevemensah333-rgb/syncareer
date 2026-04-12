-- Add columns for external job tracking
ALTER TABLE public.job_postings 
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'syncareer',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS is_external boolean NOT NULL DEFAULT false;

-- Unique constraint for deduplication on re-scrape
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_external_id 
  ON public.job_postings (external_id) 
  WHERE external_id IS NOT NULL;