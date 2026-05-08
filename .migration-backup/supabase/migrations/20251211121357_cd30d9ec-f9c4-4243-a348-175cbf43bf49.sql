-- Add onboarding_completed to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text;

-- Create student_details table
CREATE TABLE public.student_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  year_of_admission integer,
  expected_completion integer,
  major text NOT NULL,
  school text,
  degree_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create employer_details table
CREATE TABLE public.employer_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name text NOT NULL,
  company_location text,
  industry text,
  company_size text,
  job_title text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.student_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employer_details ENABLE ROW LEVEL SECURITY;

-- RLS policies for student_details
CREATE POLICY "Users can view own student details" ON public.student_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own student details" ON public.student_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own student details" ON public.student_details
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS policies for employer_details
CREATE POLICY "Users can view own employer details" ON public.employer_details
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own employer details" ON public.employer_details
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own employer details" ON public.employer_details
  FOR UPDATE USING (auth.uid() = user_id);

-- Triggers for updated_at
CREATE TRIGGER update_student_details_updated_at
  BEFORE UPDATE ON public.student_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_employer_details_updated_at
  BEFORE UPDATE ON public.employer_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();