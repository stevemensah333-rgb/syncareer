
-- Track individual module completion attempts with quiz validation
CREATE TABLE public.learning_module_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  path_id UUID NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  module_number INTEGER NOT NULL,
  quiz_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  quiz_answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER,
  passed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, path_id, module_number)
);

-- Enable RLS
ALTER TABLE public.learning_module_completions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own completions
CREATE POLICY "Users can manage their module completions"
  ON public.learning_module_completions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add milestone_level column to learning_paths
ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS milestone_level TEXT NOT NULL DEFAULT 'beginner';

-- Add last_module_completed_at to prevent rapid completions
ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS last_module_completed_at TIMESTAMP WITH TIME ZONE;
