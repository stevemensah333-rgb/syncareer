
-- PART 1: Drop community-related tables
DROP TABLE IF EXISTS community_post_bookmarks CASCADE;
DROP TABLE IF EXISTS community_post_votes CASCADE;
DROP TABLE IF EXISTS community_post_comments CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS community_bans CASCADE;
DROP TABLE IF EXISTS community_members CASCADE;
DROP TABLE IF EXISTS communities CASCADE;
DROP TABLE IF EXISTS content_reports CASCADE;

-- PART 2: Create Assessment tables
CREATE TABLE public.assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  personality_score_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  skills_score_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  work_interest_score_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  primary_interest TEXT,
  secondary_interest TEXT,
  tertiary_interest TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_id INTEGER NOT NULL,
  selected_value INTEGER NOT NULL CHECK (selected_value >= 1 AND selected_value <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;

-- RLS for assessments
CREATE POLICY "Users can view own assessments"
  ON public.assessments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own assessments"
  ON public.assessments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own assessments"
  ON public.assessments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own assessments"
  ON public.assessments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS for assessment_responses
CREATE POLICY "Users can view own responses"
  ON public.assessment_responses FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_responses.assessment_id
    AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can create own responses"
  ON public.assessment_responses FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_responses.assessment_id
    AND a.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own responses"
  ON public.assessment_responses FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.assessments a
    WHERE a.id = assessment_responses.assessment_id
    AND a.user_id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_assessments_updated_at
  BEFORE UPDATE ON public.assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
