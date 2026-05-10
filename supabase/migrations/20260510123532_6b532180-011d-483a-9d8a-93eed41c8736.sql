
-- Remove employer-specific feature tables
DROP TABLE IF EXISTS public.assessment_results CASCADE;
DROP TABLE IF EXISTS public.skills_assessments CASCADE;
DROP TABLE IF EXISTS public.interview_sessions CASCADE;

-- Make job_postings.employer_id nullable so external (scraped) jobs survive
ALTER TABLE public.job_postings ALTER COLUMN employer_id DROP NOT NULL;

-- Convert any remaining users with employer role to student so they're not orphaned
UPDATE public.profiles
   SET user_type = 'student',
       onboarding_completed = false
 WHERE user_type = 'employer';

-- Remove employer role assignments
DELETE FROM public.user_roles WHERE role = 'employer';

-- Drop employer profile/details table last (after the columns/refs above are clear)
DROP TABLE IF EXISTS public.employer_details CASCADE;
