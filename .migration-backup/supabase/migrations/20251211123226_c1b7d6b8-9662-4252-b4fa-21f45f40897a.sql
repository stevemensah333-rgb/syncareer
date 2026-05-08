-- Create qualifications table for multiple degrees/schools
CREATE TABLE public.qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  school text NOT NULL,
  degree_type text NOT NULL,
  major text NOT NULL,
  year_of_admission integer,
  year_of_completion integer,
  is_current boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.qualifications ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own qualifications" ON public.qualifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own qualifications" ON public.qualifications
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own qualifications" ON public.qualifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own qualifications" ON public.qualifications
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_qualifications_updated_at
  BEFORE UPDATE ON public.qualifications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();