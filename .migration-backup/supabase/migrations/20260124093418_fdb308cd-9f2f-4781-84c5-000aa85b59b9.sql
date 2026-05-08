-- ============================================
-- SYNCONNECT COMPREHENSIVE FEATURE TABLES
-- ============================================

-- 1. JOB POSTINGS (For Employers to create jobs)
CREATE TABLE public.job_postings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  department TEXT,
  location TEXT NOT NULL,
  employment_type TEXT NOT NULL CHECK (employment_type IN ('full-time', 'part-time', 'contract', 'internship')),
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'USD',
  description TEXT NOT NULL,
  requirements TEXT,
  skills TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed', 'paused')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage their job postings" ON public.job_postings
  FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Anyone can view active job postings" ON public.job_postings
  FOR SELECT USING (status = 'active');

-- 2. JOB APPLICATIONS (Job seekers apply to jobs)
CREATE TABLE public.job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.job_postings(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'shortlisted', 'interview', 'offered', 'hired', 'rejected', 'withdrawn')),
  cover_letter TEXT,
  resume_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(job_id, applicant_id)
);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Applicants can manage their applications" ON public.job_applications
  FOR ALL USING (auth.uid() = applicant_id);

CREATE POLICY "Employers can view applications to their jobs" ON public.job_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_postings 
      WHERE job_postings.id = job_applications.job_id 
      AND job_postings.employer_id = auth.uid()
    )
  );

CREATE POLICY "Employers can update applications to their jobs" ON public.job_applications
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.job_postings 
      WHERE job_postings.id = job_applications.job_id 
      AND job_postings.employer_id = auth.uid()
    )
  );

-- 3. INTERVIEW SESSIONS (For employers scheduling interviews with candidates)
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.job_applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  interview_type TEXT NOT NULL DEFAULT 'video' CHECK (interview_type IN ('video', 'phone', 'in-person')),
  meeting_link TEXT,
  location TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no-show')),
  interviewer_notes TEXT,
  candidate_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage interviews for their jobs" ON public.interview_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.job_applications ja
      JOIN public.job_postings jp ON ja.job_id = jp.id
      WHERE ja.id = interview_sessions.application_id
      AND jp.employer_id = auth.uid()
    )
  );

CREATE POLICY "Candidates can view their interviews" ON public.interview_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.job_applications 
      WHERE job_applications.id = interview_sessions.application_id 
      AND job_applications.applicant_id = auth.uid()
    )
  );

-- 4. MOCK INTERVIEWS (AI-powered practice interviews for job seekers)
CREATE TABLE public.mock_interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_role TEXT NOT NULL,
  industry TEXT,
  difficulty TEXT NOT NULL DEFAULT 'intermediate' CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  questions JSONB NOT NULL DEFAULT '[]',
  answers JSONB NOT NULL DEFAULT '[]',
  feedback JSONB,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.mock_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their mock interviews" ON public.mock_interviews
  FOR ALL USING (auth.uid() = user_id);

-- 5. RESUMES (AI-generated CVs for job seekers)
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Resume',
  template TEXT NOT NULL DEFAULT 'classic',
  personal_info JSONB NOT NULL DEFAULT '{}',
  education JSONB NOT NULL DEFAULT '[]',
  experience JSONB NOT NULL DEFAULT '[]',
  skills JSONB NOT NULL DEFAULT '[]',
  projects JSONB NOT NULL DEFAULT '[]',
  achievements JSONB NOT NULL DEFAULT '[]',
  references_section TEXT DEFAULT 'Available upon request',
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their resumes" ON public.resumes
  FOR ALL USING (auth.uid() = user_id);

-- 6. COUNSELLOR AVAILABILITY (Time slots for counsellors)
CREATE TABLE public.counsellor_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL REFERENCES public.counsellor_details(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(counsellor_id, day_of_week, start_time)
);

ALTER TABLE public.counsellor_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counsellors can manage their availability" ON public.counsellor_availability
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.counsellor_details 
      WHERE counsellor_details.id = counsellor_availability.counsellor_id 
      AND counsellor_details.user_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can view counsellor availability" ON public.counsellor_availability
  FOR SELECT USING (is_available = true);

-- 7. COUNSELLOR SESSIONS (Booked consultations with video links)
CREATE TABLE public.counsellor_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  counsellor_id UUID NOT NULL REFERENCES public.counsellor_details(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  meeting_link TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show')),
  session_notes TEXT,
  amount_paid DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'waived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.counsellor_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Counsellors can manage their sessions" ON public.counsellor_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.counsellor_details 
      WHERE counsellor_details.id = counsellor_sessions.counsellor_id 
      AND counsellor_details.user_id = auth.uid()
    )
  );

CREATE POLICY "Clients can view and manage their sessions" ON public.counsellor_sessions
  FOR ALL USING (auth.uid() = client_id);

-- 8. NOTIFICATIONS (Platform-wide notification system)
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('application', 'interview', 'message', 'booking', 'system', 'job_match', 'reminder')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their notifications" ON public.notifications
  FOR ALL USING (auth.uid() = user_id);

-- 9. SKILLS ASSESSMENTS (Employer-created tests for candidates)
CREATE TABLE public.skills_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  questions JSONB NOT NULL DEFAULT '[]',
  passing_score INTEGER DEFAULT 70,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.skills_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employers can manage their assessments" ON public.skills_assessments
  FOR ALL USING (auth.uid() = employer_id);

CREATE POLICY "Anyone can view active assessments" ON public.skills_assessments
  FOR SELECT USING (is_active = true);

-- 10. ASSESSMENT RESULTS (Candidate test results)
CREATE TABLE public.assessment_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id UUID NOT NULL REFERENCES public.skills_assessments(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.job_applications(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '[]',
  score INTEGER CHECK (score >= 0 AND score <= 100),
  passed BOOLEAN,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  UNIQUE(assessment_id, candidate_id)
);

ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can manage their results" ON public.assessment_results
  FOR ALL USING (auth.uid() = candidate_id);

CREATE POLICY "Employers can view results for their assessments" ON public.assessment_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.skills_assessments 
      WHERE skills_assessments.id = assessment_results.assessment_id 
      AND skills_assessments.employer_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_job_postings_employer ON public.job_postings(employer_id);
CREATE INDEX idx_job_postings_status ON public.job_postings(status);
CREATE INDEX idx_job_applications_job ON public.job_applications(job_id);
CREATE INDEX idx_job_applications_applicant ON public.job_applications(applicant_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_mock_interviews_user ON public.mock_interviews(user_id);
CREATE INDEX idx_resumes_user ON public.resumes(user_id);

-- Add trigger for updated_at columns
CREATE TRIGGER update_job_postings_updated_at BEFORE UPDATE ON public.job_postings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_job_applications_updated_at BEFORE UPDATE ON public.job_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_interview_sessions_updated_at BEFORE UPDATE ON public.interview_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_resumes_updated_at BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_counsellor_sessions_updated_at BEFORE UPDATE ON public.counsellor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_skills_assessments_updated_at BEFORE UPDATE ON public.skills_assessments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;