-- Create the update_updated_at_column function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create portfolio_projects table
CREATE TABLE public.portfolio_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  project_url TEXT,
  github_url TEXT,
  tags TEXT[] DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create portfolio_reviews table for peer reviews
CREATE TABLE public.portfolio_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.portfolio_projects(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create learning_goals table for weekly goals
CREATE TABLE public.learning_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 5,
  current_count INTEGER NOT NULL DEFAULT 0,
  week_start DATE NOT NULL DEFAULT date_trunc('week', CURRENT_DATE)::date,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, goal_type, week_start)
);

-- Create learning_paths table for tracking path progress
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  path_title TEXT NOT NULL,
  total_modules INTEGER NOT NULL DEFAULT 24,
  completed_modules INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_title)
);

-- Enable RLS on all tables
ALTER TABLE public.portfolio_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;

-- Portfolio projects policies
CREATE POLICY "Anyone can view portfolio projects" ON public.portfolio_projects
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their projects" ON public.portfolio_projects
  FOR ALL USING (auth.uid() = user_id);

-- Portfolio reviews policies
CREATE POLICY "Anyone can view reviews" ON public.portfolio_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can create reviews for others projects" ON public.portfolio_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id AND
    auth.uid() != (SELECT user_id FROM public.portfolio_projects WHERE id = project_id)
  );

CREATE POLICY "Users can update their reviews" ON public.portfolio_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Users can delete their reviews" ON public.portfolio_reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Learning goals policies
CREATE POLICY "Users can manage their goals" ON public.learning_goals
  FOR ALL USING (auth.uid() = user_id);

-- Learning paths policies
CREATE POLICY "Users can manage their paths" ON public.learning_paths
  FOR ALL USING (auth.uid() = user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_portfolio_projects_updated_at
  BEFORE UPDATE ON public.portfolio_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_portfolio_reviews_updated_at
  BEFORE UPDATE ON public.portfolio_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_goals_updated_at
  BEFORE UPDATE ON public.learning_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_learning_paths_updated_at
  BEFORE UPDATE ON public.learning_paths
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();