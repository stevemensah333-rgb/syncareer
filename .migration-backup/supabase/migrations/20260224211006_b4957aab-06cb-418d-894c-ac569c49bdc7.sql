
-- Track user engagement with external courses per skill
CREATE TABLE public.user_course_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  skill_name TEXT NOT NULL,
  career_path TEXT NOT NULL,
  course_title TEXT NOT NULL,
  course_url TEXT,
  status TEXT NOT NULL DEFAULT 'saved',
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, course_title, skill_name)
);

ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own course progress"
  ON public.user_course_progress
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_course_progress_user ON public.user_course_progress (user_id, career_path);
