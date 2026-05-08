-- Employers can view student details for their applicants
CREATE POLICY "Employers can view applicant student details"
ON public.student_details FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    WHERE ja.applicant_id = student_details.user_id
      AND jp.employer_id = auth.uid()
  )
);

-- Employers can view applicant skills
CREATE POLICY "Employers can view applicant skills"
ON public.user_skills FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_applications ja
    JOIN job_postings jp ON ja.job_id = jp.id
    WHERE ja.applicant_id = user_skills.user_id
      AND jp.employer_id = auth.uid()
  )
);

-- Anyone authenticated can view employer details if employer has active jobs
CREATE POLICY "Users can view employer details for active jobs"
ON public.employer_details FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM job_postings
    WHERE job_postings.employer_id = employer_details.user_id
      AND job_postings.status = 'active'
  )
);