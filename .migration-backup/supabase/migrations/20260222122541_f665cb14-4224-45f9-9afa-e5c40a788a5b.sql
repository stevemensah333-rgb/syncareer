
-- ===========================================
-- Phase 1: Career Intelligence Engine Tables
-- ===========================================

-- 1. User Intelligence Profiles
-- Stores computed intelligence features per user
CREATE TABLE public.user_intelligence_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  skill_mastery_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  career_clusters JSONB NOT NULL DEFAULT '[]'::jsonb,
  learning_momentum DOUBLE PRECISION NOT NULL DEFAULT 0,
  exploration_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  maturity_level TEXT NOT NULL DEFAULT 'beginner',
  success_rate DOUBLE PRECISION NOT NULL DEFAULT 0,
  feature_weights JSONB NOT NULL DEFAULT '{"interview": 0.85, "assessment": 0.80, "portfolio": 0.70, "cv": 0.60}'::jsonb,
  last_computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.user_intelligence_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "Users can read own intelligence profile"
  ON public.user_intelligence_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Only service role (edge functions) can insert/update
CREATE POLICY "Service can insert intelligence profiles"
  ON public.user_intelligence_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service can update intelligence profiles"
  ON public.user_intelligence_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_intelligence_profiles_updated_at
  BEFORE UPDATE ON public.user_intelligence_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Recommendation Outcomes
-- Tracks what was recommended and the user's action/outcome
CREATE TABLE public.recommendation_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recommendation_type TEXT NOT NULL DEFAULT 'career',
  recommended_item_id TEXT,
  recommended_item_title TEXT NOT NULL,
  confidence_score DOUBLE PRECISION NOT NULL DEFAULT 0,
  recommendation_category TEXT NOT NULL DEFAULT 'safe',
  user_action TEXT DEFAULT 'none',
  outcome TEXT DEFAULT 'pending',
  outcome_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acted_at TIMESTAMP WITH TIME ZONE,
  outcome_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.recommendation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own recommendation outcomes"
  ON public.recommendation_outcomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendation outcomes"
  ON public.recommendation_outcomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendation outcomes"
  ON public.recommendation_outcomes FOR UPDATE
  USING (auth.uid() = user_id);

-- 3. Career Guidance Sessions
-- Stores AI Coach conversations with structured metadata
CREATE TABLE public.career_guidance_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'general',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  structured_output JSONB DEFAULT NULL,
  top_recommendation TEXT,
  confidence_score DOUBLE PRECISION,
  suggested_next_skill TEXT,
  risk_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.career_guidance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own guidance sessions"
  ON public.career_guidance_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_career_guidance_sessions_updated_at
  BEFORE UPDATE ON public.career_guidance_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
