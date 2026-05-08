
-- Create user_feedback table
CREATE TABLE public.user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature_name text NOT NULL,
  response_type text NOT NULL CHECK (response_type IN ('positive', 'negative')),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
ON public.user_feedback
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own feedback (for rate-limiting checks)
CREATE POLICY "Users can view own feedback"
ON public.user_feedback
FOR SELECT
USING (auth.uid() = user_id);

-- Admin can view all feedback via has_role function
CREATE POLICY "Admins can view all feedback"
ON public.user_feedback
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for efficient querying
CREATE INDEX idx_user_feedback_user_feature ON public.user_feedback (user_id, feature_name, created_at DESC);
CREATE INDEX idx_user_feedback_feature ON public.user_feedback (feature_name, created_at DESC);
