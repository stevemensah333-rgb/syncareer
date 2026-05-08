-- Fix: Create a secure view for candidates that excludes sensitive interviewer notes
-- Candidates should see their own feedback, but not internal interviewer notes

-- Create a view for candidate-facing interview data (excludes interviewer_notes)
CREATE OR REPLACE VIEW public.candidate_interview_view AS
SELECT 
  id,
  application_id,
  scheduled_at,
  duration_minutes,
  interview_type,
  meeting_link,
  location,
  notes,  -- general notes that can be shared
  status,
  candidate_feedback,  -- feedback meant for candidates
  created_at,
  updated_at
  -- interviewer_notes is intentionally excluded
FROM interview_sessions;

-- Grant access to the view
GRANT SELECT ON public.candidate_interview_view TO authenticated;

-- Add comment explaining the security design
COMMENT ON VIEW public.candidate_interview_view IS 'Candidate-safe view of interview sessions - excludes private interviewer_notes field';