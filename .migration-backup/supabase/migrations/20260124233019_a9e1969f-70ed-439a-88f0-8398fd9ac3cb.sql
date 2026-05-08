-- Allow employers to view profiles of applicants who applied to their jobs
CREATE POLICY "Employers can view applicant profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    WHERE ja.applicant_id = profiles.id
    AND jp.employer_id = auth.uid()
  )
);