
-- Create usage_logs table for tracking feature usage (AI sessions, etc.)
CREATE TABLE public.usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  feature_key text NOT NULL,
  usage_count integer NOT NULL DEFAULT 1,
  month text NOT NULL, -- format: YYYY-MM
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature_key, month)
);

ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own usage logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own usage logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own usage logs"
  ON public.usage_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger to auto-assign free subscription on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, tier, status)
  VALUES (NEW.id, 'free', 'active')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Add unique constraint on subscriptions.user_id if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_user_id_key'
  ) THEN
    ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);
  END IF;
END$$;

-- Create trigger on profiles table (fires after new profile is inserted, which happens on new user)
DROP TRIGGER IF EXISTS on_new_profile_create_subscription ON public.profiles;
CREATE TRIGGER on_new_profile_create_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_subscription();

-- updated_at trigger for usage_logs
CREATE TRIGGER update_usage_logs_updated_at
  BEFORE UPDATE ON public.usage_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
