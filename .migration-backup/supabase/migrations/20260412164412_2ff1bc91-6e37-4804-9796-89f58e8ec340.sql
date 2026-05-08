
-- 1. Add last_digest_sent_at to notification_preferences
ALTER TABLE public.notification_preferences
ADD COLUMN IF NOT EXISTS last_digest_sent_at timestamp with time zone;

-- 2. Add referral_code to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- 3. Create referrals table
CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referee_id uuid,
  referral_code text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reward_granted boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own referrals"
ON public.referrals FOR SELECT
USING (auth.uid() = referrer_id OR auth.uid() = referee_id);

CREATE POLICY "Users can create referrals"
ON public.referrals FOR INSERT
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "System can update referrals"
ON public.referrals FOR UPDATE
USING (auth.uid() = referee_id OR auth.uid() = referrer_id);

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Create university_insights table
CREATE TABLE public.university_insights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name text NOT NULL,
  major text NOT NULL,
  top_careers jsonb NOT NULL DEFAULT '[]'::jsonb,
  graduate_outcomes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(university_name, major)
);

ALTER TABLE public.university_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read university insights"
ON public.university_insights FOR SELECT
TO authenticated
USING (true);

CREATE TRIGGER update_university_insights_updated_at
BEFORE UPDATE ON public.university_insights
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Generate referral codes for existing users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substring(md5(NEW.id::text || now()::text) from 1 for 8));
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_referral_code_on_profile
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
WHEN (NEW.referral_code IS NULL)
EXECUTE FUNCTION public.generate_referral_code();
