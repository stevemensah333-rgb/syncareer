-- Referral code trigger on profiles (referrals table is unused)
DROP TRIGGER IF EXISTS set_referral_code_on_profile ON public.profiles;
DROP FUNCTION IF EXISTS public.generate_referral_code();
DROP FUNCTION IF EXISTS public.get_my_referral_code();
DROP TABLE IF EXISTS public.referrals;

-- Counsellor scheduling leftovers
DROP TABLE IF EXISTS public.counsellor_availability;
DROP TABLE IF EXISTS public.counsellor_reviews;
DROP TABLE IF EXISTS public.counsellor_sessions;
DROP FUNCTION IF EXISTS public.enforce_counsellor_session_updates();

-- Old skill graph
DROP TABLE IF EXISTS public.skill_evidence;
DROP TABLE IF EXISTS public.user_skill_map;
DROP TABLE IF EXISTS public.skill_endorsements;
DROP TABLE IF EXISTS public.career_skills;

-- Unused caches / logs
DROP TABLE IF EXISTS public.career_guidance_sessions;
DROP TABLE IF EXISTS public.university_insights;

-- Paid-model leftover: payments (subscriptions.payment_id no longer needed)
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS payment_id;
DROP TABLE IF EXISTS public.payments;