-- Add tour_completed flag to profiles so the post-onboarding quick tour
-- shows exactly once per user, persisted across devices and sessions.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tour_completed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.tour_completed IS
  'True once the user has finished or dismissed the post-onboarding quick tour.';
