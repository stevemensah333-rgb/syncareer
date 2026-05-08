-- Enable realtime for post_likes and post_comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Create user_stats table for tracking SkillScore, endorsements, etc.
CREATE TABLE public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  skill_score INTEGER NOT NULL DEFAULT 0,
  skills_verified INTEGER NOT NULL DEFAULT 0,
  network_count INTEGER NOT NULL DEFAULT 0,
  endorsements_received INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own stats"
  ON public.user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own stats"
  ON public.user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- Create user_connections table for networking
CREATE TABLE public.user_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  connected_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, connected_user_id)
);

-- Enable RLS
ALTER TABLE public.user_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies for connections
CREATE POLICY "Users can view their connections"
  ON public.user_connections FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can create connections"
  ON public.user_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their connections"
  ON public.user_connections FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = connected_user_id);

CREATE POLICY "Users can delete their connections"
  ON public.user_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Create skill_endorsements table
CREATE TABLE public.skill_endorsements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endorser_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, endorser_id, skill_name)
);

-- Enable RLS
ALTER TABLE public.skill_endorsements ENABLE ROW LEVEL SECURITY;

-- RLS policies for endorsements
CREATE POLICY "Anyone can view endorsements"
  ON public.skill_endorsements FOR SELECT
  USING (true);

CREATE POLICY "Users can endorse others"
  ON public.skill_endorsements FOR INSERT
  WITH CHECK (auth.uid() = endorser_id AND auth.uid() != user_id);

CREATE POLICY "Users can remove their endorsements"
  ON public.skill_endorsements FOR DELETE
  USING (auth.uid() = endorser_id);

-- Trigger for updated_at on user_stats
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function to initialize user stats on profile creation
CREATE OR REPLACE FUNCTION public.initialize_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, skill_score)
  VALUES (NEW.id, 100)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Trigger to auto-create stats for new users
CREATE TRIGGER on_profile_created_init_stats
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_stats();