-- Drop challenge_participants table (depends on weekly_challenges)
DROP TABLE IF EXISTS public.challenge_participants CASCADE;

-- Drop weekly_challenges table
DROP TABLE IF EXISTS public.weekly_challenges CASCADE;

-- Drop professional_transition_details table
DROP TABLE IF EXISTS public.professional_transition_details CASCADE;