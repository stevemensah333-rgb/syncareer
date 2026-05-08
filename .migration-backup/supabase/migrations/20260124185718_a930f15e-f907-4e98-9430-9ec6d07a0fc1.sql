-- Create weekly_challenges table
CREATE TABLE public.weekly_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skill_category TEXT NOT NULL,
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  reward TEXT NOT NULL DEFAULT 'SkillScore +50',
  difficulty TEXT NOT NULL DEFAULT 'intermediate',
  max_participants INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge_participants table
CREATE TABLE public.challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  submission_url TEXT,
  UNIQUE(challenge_id, user_id)
);

-- Enable RLS
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

-- RLS policies for challenges
CREATE POLICY "Anyone can view active challenges"
  ON public.weekly_challenges FOR SELECT
  USING (is_active = true);

-- RLS policies for participants
CREATE POLICY "Anyone can view challenge participants"
  ON public.challenge_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_weekly_challenges_updated_at
  BEFORE UPDATE ON public.weekly_challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Insert some initial challenges
INSERT INTO public.weekly_challenges (title, description, skill_category, deadline, reward, difficulty) VALUES
('Frontend Mastery', 'Build a responsive dashboard component using React and Tailwind CSS', 'React', NOW() + INTERVAL '5 days', 'Top 10 Featured', 'intermediate'),
('Data Analysis Sprint', 'Analyze a dataset and create visualizations using Python or JavaScript', 'Data Analysis', NOW() + INTERVAL '3 days', 'SkillScore +100', 'advanced'),
('API Integration Challenge', 'Connect to a public API and display data in a creative way', 'API Development', NOW() + INTERVAL '7 days', 'SkillScore +75', 'beginner');