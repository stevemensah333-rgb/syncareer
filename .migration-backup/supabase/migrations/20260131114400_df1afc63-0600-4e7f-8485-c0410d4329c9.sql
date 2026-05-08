-- Fix the security definer view issue by explicitly setting SECURITY INVOKER
DROP VIEW IF EXISTS public.candidate_interview_view;

CREATE VIEW public.candidate_interview_view 
WITH (security_invoker = true)
AS
SELECT 
  id,
  application_id,
  scheduled_at,
  duration_minutes,
  interview_type,
  meeting_link,
  location,
  notes,
  status,
  candidate_feedback,
  created_at,
  updated_at
FROM interview_sessions;

-- Grant access to the view
GRANT SELECT ON public.candidate_interview_view TO authenticated;

COMMENT ON VIEW public.candidate_interview_view IS 'Candidate-safe view of interview sessions - excludes private interviewer_notes field. Uses SECURITY INVOKER for proper RLS enforcement.';