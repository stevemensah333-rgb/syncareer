ALTER TABLE public.user_feedback DROP CONSTRAINT user_feedback_response_type_check;
ALTER TABLE public.user_feedback ADD CONSTRAINT user_feedback_response_type_check
  CHECK (response_type = ANY (ARRAY['positive'::text, 'negative'::text, 'problem'::text, 'improvement'::text, 'general'::text]));