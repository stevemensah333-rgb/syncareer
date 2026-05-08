-- Create learning_streaks table to track user learning activity
CREATE TABLE public.learning_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_learning_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create learning_activity table to track daily activities
CREATE TABLE public.learning_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'lesson', 'quiz', 'video', 'project'
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  duration_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_activities ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_streaks
CREATE POLICY "Users can manage their streaks"
ON public.learning_streaks
FOR ALL
USING (auth.uid() = user_id);

-- RLS policies for learning_activities
CREATE POLICY "Users can manage their activities"
ON public.learning_activities
FOR ALL
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_learning_activities_user_date ON public.learning_activities(user_id, activity_date);

-- Trigger to update streaks
CREATE OR REPLACE FUNCTION public.update_learning_streak()
RETURNS TRIGGER AS $$
DECLARE
  streak_record RECORD;
  days_diff INTEGER;
BEGIN
  -- Get or create streak record
  SELECT * INTO streak_record FROM public.learning_streaks WHERE user_id = NEW.user_id;
  
  IF streak_record IS NULL THEN
    INSERT INTO public.learning_streaks (user_id, current_streak, last_activity_date, total_learning_days)
    VALUES (NEW.user_id, 1, NEW.activity_date, 1);
  ELSE
    -- Check if this is a new day's activity
    IF streak_record.last_activity_date IS NULL OR streak_record.last_activity_date < NEW.activity_date THEN
      days_diff := COALESCE(NEW.activity_date - streak_record.last_activity_date, 0);
      
      IF days_diff = 1 THEN
        -- Consecutive day - increment streak
        UPDATE public.learning_streaks
        SET current_streak = current_streak + 1,
            longest_streak = GREATEST(longest_streak, current_streak + 1),
            last_activity_date = NEW.activity_date,
            total_learning_days = total_learning_days + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id;
      ELSIF days_diff > 1 THEN
        -- Streak broken - reset to 1
        UPDATE public.learning_streaks
        SET current_streak = 1,
            last_activity_date = NEW.activity_date,
            total_learning_days = total_learning_days + 1,
            updated_at = now()
        WHERE user_id = NEW.user_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_learning_activity_insert
AFTER INSERT ON public.learning_activities
FOR EACH ROW
EXECUTE FUNCTION public.update_learning_streak();