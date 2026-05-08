
-- Fix: Skills assessments questions should not be exposed to all users
-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view active assessments" ON public.skills_assessments;

-- Only employers can view their own assessments (with full questions)
CREATE POLICY "Employers can view own assessments"
  ON public.skills_assessments
  FOR SELECT
  USING (auth.uid() = employer_id);

-- Create a public view WITHOUT the questions field for candidates to browse
CREATE OR REPLACE VIEW public.skills_assessments_public
WITH (security_invoker = true)
AS
SELECT 
  id,
  employer_id,
  title,
  description,
  duration_minutes,
  passing_score,
  is_active,
  created_at,
  updated_at
FROM public.skills_assessments
WHERE is_active = true;

GRANT SELECT ON public.skills_assessments_public TO authenticated;
