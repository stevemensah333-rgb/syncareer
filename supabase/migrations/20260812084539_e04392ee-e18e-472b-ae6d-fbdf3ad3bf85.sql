CREATE TABLE public.assistant_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id UUID NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','completed','failed')),
  proposal JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT assistant_requests_user_request_unique UNIQUE (user_id, request_id)
);

GRANT ALL ON public.assistant_requests TO service_role;

ALTER TABLE public.assistant_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_requests_service_role_only"
  ON public.assistant_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE TRIGGER update_assistant_requests_updated_at
  BEFORE UPDATE ON public.assistant_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();