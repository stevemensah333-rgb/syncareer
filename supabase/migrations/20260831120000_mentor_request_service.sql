-- Mentor request service: additive replacement for the legacy counsellor scheduler.
-- Legacy counsellor booking/session data is intentionally preserved.

ALTER TABLE public.counsellor_details
  ADD COLUMN IF NOT EXISTS current_role text,
  ADD COLUMN IF NOT EXISTS expertise_tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS years_experience integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS availability_status text NOT NULL DEFAULT 'paused';

-- Phone contact is retired from the active mentor flow. Keep legacy values, but
-- do not require new mentors to provide them.
ALTER TABLE public.counsellor_details
  ALTER COLUMN phone_number DROP NOT NULL,
  ALTER COLUMN country_code DROP NOT NULL;

ALTER TABLE public.counsellor_details
  DROP CONSTRAINT IF EXISTS counsellor_details_years_experience_check,
  ADD CONSTRAINT counsellor_details_years_experience_check
    CHECK (years_experience BETWEEN 0 AND 60),
  DROP CONSTRAINT IF EXISTS counsellor_details_availability_status_check,
  ADD CONSTRAINT counsellor_details_availability_status_check
    CHECK (availability_status IN ('accepting', 'limited', 'paused'));

CREATE TABLE public.mentor_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL UNIQUE REFERENCES public.counsellor_details(id) ON DELETE CASCADE,
  email_domain text NOT NULL,
  claimed_organization text NOT NULL CHECK (char_length(claimed_organization) BETWEEN 2 AND 160),
  canonical_company_name text CHECK (canonical_company_name IS NULL OR char_length(canonical_company_name) BETWEEN 2 AND 160),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  verified_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  rejection_reason text CHECK (rejection_reason IS NULL OR char_length(rejection_reason) <= 500),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.counsellor_details(id) ON DELETE RESTRICT,
  request_type text NOT NULL CHECK (request_type IN (
    'resume_cv_review', 'portfolio_feedback', 'career_path_conversation',
    'interview_preparation', 'role_industry_insight'
  )),
  goal text NOT NULL CHECK (char_length(goal) BETWEEN 10 AND 240),
  context text NOT NULL CHECK (char_length(context) BETWEEN 20 AND 2000),
  deadline date,
  supporting_url text CHECK (
    supporting_url IS NULL OR
    (char_length(supporting_url) <= 500 AND supporting_url ~* '^https?://')
  ),
  job_application_id uuid REFERENCES public.job_applications(id) ON DELETE SET NULL,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'withdrawn', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  completed_at timestamptz
);

CREATE UNIQUE INDEX mentorship_requests_one_active_pair
  ON public.mentorship_requests (mentee_id, mentor_id)
  WHERE status IN ('pending', 'accepted');
CREATE INDEX mentorship_requests_mentee_created
  ON public.mentorship_requests (mentee_id, created_at DESC);
CREATE INDEX mentorship_requests_mentor_created
  ON public.mentorship_requests (mentor_id, created_at DESC);

CREATE TABLE public.mentorship_email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_key text NOT NULL UNIQUE,
  template_name text NOT NULL,
  recipient_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id uuid REFERENCES public.mentorship_requests(id) ON DELETE CASCADE,
  template_data jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'queued', 'failed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX mentorship_email_outbox_pending
  ON public.mentorship_email_outbox (created_at) WHERE status IN ('pending', 'failed');

ALTER TABLE public.mentor_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_email_outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mentors can read own verification"
  ON public.mentor_verifications FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.counsellor_details cd
    WHERE cd.id = mentor_id AND cd.user_id = auth.uid()
  ));
CREATE POLICY "Admins can read mentor verifications"
  ON public.mentor_verifications FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Participants can read mentorship requests"
  ON public.mentorship_requests FOR SELECT TO authenticated
  USING (
    mentee_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.counsellor_details cd
      WHERE cd.id = mentor_id AND cd.user_id = auth.uid()
    )
  );
CREATE POLICY "Service role manages mentorship email outbox"
  ON public.mentorship_email_outbox FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.invalidate_mentor_verification_on_email_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF lower(coalesce(NEW.email,'')) IS DISTINCT FROM lower(coalesce(OLD.email,'')) THEN
    UPDATE public.mentor_verifications mv SET
      email_domain=lower(split_part(NEW.email,'@',2)), status='pending',
      canonical_company_name=NULL, decided_at=NULL, verified_at=NULL,
      reviewed_by=NULL, rejection_reason=NULL, submitted_at=now(), updated_at=now()
    FROM public.counsellor_details cd
    WHERE mv.mentor_id=cd.id AND cd.user_id=NEW.id;
    UPDATE public.counsellor_details SET availability_status='paused', updated_at=now()
    WHERE user_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS invalidate_mentor_verification_email ON auth.users;
CREATE TRIGGER invalidate_mentor_verification_email
AFTER UPDATE OF email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.invalidate_mentor_verification_on_email_change();
REVOKE ALL ON FUNCTION public.invalidate_mentor_verification_on_email_change() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE VIEW public.mentor_profiles_public
WITH (security_barrier = true) AS
SELECT
  cd.id AS mentor_id,
  cd.full_name,
  cd.avatar_url,
  cd.bio,
  cd.current_role,
  cd.expertise_tags,
  cd.years_experience,
  cd.availability_status,
  mv.canonical_company_name AS company_name,
  mv.email_domain,
  mv.verified_at
FROM public.counsellor_details cd
JOIN public.mentor_verifications mv ON mv.mentor_id = cd.id
WHERE mv.status = 'approved'
  AND cd.availability_status IN ('accepting', 'limited');

GRANT SELECT ON public.mentor_profiles_public TO authenticated;
REVOKE ALL ON public.mentor_profiles_public FROM anon;

CREATE OR REPLACE FUNCTION public.submit_mentor_verification(p_claimed_organization text)
RETURNS public.mentor_verifications
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_user auth.users; v_mentor public.counsellor_details; v_row public.mentor_verifications;
BEGIN
  SELECT * INTO v_user FROM auth.users WHERE id = auth.uid() AND email_confirmed_at IS NOT NULL;
  IF v_user.id IS NULL OR v_user.email IS NULL THEN RAISE EXCEPTION 'A confirmed organization email is required'; END IF;
  SELECT * INTO v_mentor FROM public.counsellor_details WHERE user_id = auth.uid();
  IF v_mentor.id IS NULL OR public.get_profile_user_type(auth.uid()) <> 'career_counsellor' THEN RAISE EXCEPTION 'Mentor profile required'; END IF;
  IF char_length(trim(p_claimed_organization)) NOT BETWEEN 2 AND 160 THEN RAISE EXCEPTION 'Organization is required'; END IF;
  INSERT INTO public.mentor_verifications (mentor_id, email_domain, claimed_organization, status, submitted_at, updated_at)
  VALUES (v_mentor.id, lower(split_part(v_user.email, '@', 2)), trim(p_claimed_organization), 'pending', now(), now())
  ON CONFLICT (mentor_id) DO UPDATE SET
    email_domain = EXCLUDED.email_domain,
    claimed_organization = EXCLUDED.claimed_organization,
    canonical_company_name = NULL,
    status = 'pending', submitted_at = now(), decided_at = NULL, verified_at = NULL,
    reviewed_by = NULL, rejection_reason = NULL, updated_at = now()
  RETURNING * INTO v_row;
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_mentorship_request(
  p_mentor_id uuid, p_request_type text, p_goal text, p_context text,
  p_deadline date DEFAULT NULL, p_supporting_url text DEFAULT NULL,
  p_job_application_id uuid DEFAULT NULL, p_resume_id uuid DEFAULT NULL
) RETURNS public.mentorship_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_request public.mentorship_requests; v_mentor_name text; v_mentee_name text;
BEGIN
  IF public.get_profile_user_type(auth.uid()) <> 'student' THEN RAISE EXCEPTION 'Only students can create requests'; END IF;
  IF p_deadline IS NOT NULL AND p_deadline < current_date THEN RAISE EXCEPTION 'Deadline cannot be in the past'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.mentor_profiles_public m WHERE m.mentor_id = p_mentor_id
  ) THEN RAISE EXCEPTION 'Mentor is not accepting requests'; END IF;
  IF p_job_application_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.job_applications WHERE id = p_job_application_id AND applicant_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Application is not available'; END IF;
  IF p_resume_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.resumes WHERE id = p_resume_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'CV is not available'; END IF;
  INSERT INTO public.mentorship_requests (
    mentee_id, mentor_id, request_type, goal, context, deadline,
    supporting_url, job_application_id, resume_id
  ) VALUES (
    auth.uid(), p_mentor_id, p_request_type, trim(p_goal), trim(p_context), p_deadline,
    nullif(trim(p_supporting_url), ''), p_job_application_id, p_resume_id
  ) RETURNING * INTO v_request;
  SELECT full_name INTO v_mentor_name FROM public.counsellor_details WHERE id = p_mentor_id;
  SELECT coalesce(full_name, 'A student') INTO v_mentee_name FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.mentorship_email_outbox (event_key, template_name, recipient_user_id, request_id, template_data)
  SELECT 'request:' || v_request.id || ':new', 'mentor-request-new', cd.user_id, v_request.id,
    jsonb_build_object('mentorName', v_mentor_name, 'menteeName', v_mentee_name, 'requestId', v_request.id, 'requestType', p_request_type, 'goal', trim(p_goal))
  FROM public.counsellor_details cd WHERE cd.id = p_mentor_id;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_to_mentorship_request(p_request_id uuid, p_decision text)
RETURNS public.mentorship_requests
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE v_request public.mentorship_requests; v_mentor public.counsellor_details; v_mentor_email text; v_mentee_email text; v_mentee_name text;
BEGIN
  IF p_decision NOT IN ('accepted', 'declined') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  SELECT mr.* INTO v_request FROM public.mentorship_requests mr
  JOIN public.counsellor_details cd ON cd.id = mr.mentor_id
  WHERE mr.id = p_request_id AND cd.user_id = auth.uid() FOR UPDATE;
  IF v_request.id IS NULL THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status <> 'pending' THEN RAISE EXCEPTION 'Request has already been decided'; END IF;
  IF p_decision = 'accepted' AND NOT EXISTS (
    SELECT 1 FROM public.mentor_verifications mv WHERE mv.mentor_id=v_request.mentor_id AND mv.status='approved'
  ) THEN RAISE EXCEPTION 'Mentor verification is no longer active'; END IF;
  UPDATE public.mentorship_requests SET status = p_decision, decided_at = now(), updated_at = now()
  WHERE id = p_request_id RETURNING * INTO v_request;
  SELECT * INTO v_mentor FROM public.counsellor_details WHERE id = v_request.mentor_id;
  SELECT email INTO v_mentor_email FROM auth.users WHERE id = v_mentor.user_id;
  SELECT email INTO v_mentee_email FROM auth.users WHERE id = v_request.mentee_id;
  SELECT coalesce(full_name, 'Student') INTO v_mentee_name FROM public.profiles WHERE id = v_request.mentee_id;
  IF p_decision = 'accepted' THEN
    INSERT INTO public.mentorship_email_outbox (event_key, template_name, recipient_user_id, request_id, template_data) VALUES
      ('request:' || v_request.id || ':accepted:mentor', 'mentor-request-accepted-mentor', v_mentor.user_id, v_request.id,
       jsonb_build_object('mentorName', v_mentor.full_name, 'menteeName', v_mentee_name, 'menteeEmail', v_mentee_email, 'requestId', v_request.id, 'requestType', v_request.request_type, 'goal', v_request.goal, 'context', v_request.context)),
      ('request:' || v_request.id || ':accepted:mentee', 'mentor-request-accepted-mentee', v_request.mentee_id, v_request.id,
       jsonb_build_object('mentorName', v_mentor.full_name, 'menteeName', v_mentee_name, 'mentorEmail', v_mentor_email, 'requestId', v_request.id, 'requestType', v_request.request_type, 'goal', v_request.goal, 'context', v_request.context));
  ELSE
    INSERT INTO public.mentorship_email_outbox (event_key, template_name, recipient_user_id, request_id, template_data)
    VALUES ('request:' || v_request.id || ':declined', 'mentor-request-declined', v_request.mentee_id, v_request.id,
      jsonb_build_object('mentorName', v_mentor.full_name, 'menteeName', v_mentee_name, 'requestId', v_request.id));
  END IF;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_mentorship_request_status(p_request_id uuid, p_action text)
RETURNS public.mentorship_requests
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_request public.mentorship_requests; v_is_mentor boolean;
BEGIN
  SELECT mr.* INTO v_request FROM public.mentorship_requests mr WHERE mr.id = p_request_id FOR UPDATE;
  SELECT EXISTS (SELECT 1 FROM public.counsellor_details cd WHERE cd.id = v_request.mentor_id AND cd.user_id = auth.uid()) INTO v_is_mentor;
  IF v_request.id IS NULL OR (v_request.mentee_id <> auth.uid() AND NOT v_is_mentor) THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF p_action = 'withdraw' AND v_request.mentee_id = auth.uid() AND v_request.status = 'pending' THEN
    UPDATE public.mentorship_requests SET status='withdrawn', updated_at=now() WHERE id=p_request_id RETURNING * INTO v_request;
  ELSIF p_action = 'complete' AND v_request.status = 'accepted' THEN
    UPDATE public.mentorship_requests SET status='completed', completed_at=now(), updated_at=now() WHERE id=p_request_id RETURNING * INTO v_request;
  ELSE RAISE EXCEPTION 'Invalid request transition'; END IF;
  RETURN v_request;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mentor_verification(
  p_verification_id uuid, p_decision text, p_company_name text DEFAULT NULL, p_rejection_reason text DEFAULT NULL
) RETURNS public.mentor_verifications
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.mentor_verifications; v_recipient uuid; v_name text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF p_decision NOT IN ('approved', 'rejected', 'revoked') THEN RAISE EXCEPTION 'Invalid decision'; END IF;
  IF p_decision = 'approved' AND char_length(trim(coalesce(p_company_name,''))) < 2 THEN RAISE EXCEPTION 'Company name is required'; END IF;
  IF p_decision = 'rejected' AND char_length(trim(coalesce(p_rejection_reason,''))) < 2 THEN RAISE EXCEPTION 'Rejection reason is required'; END IF;
  IF p_decision = 'approved' AND NOT EXISTS (
    SELECT 1 FROM public.mentor_verifications mv
    JOIN public.counsellor_details cd ON cd.id=mv.mentor_id
    JOIN auth.users u ON u.id=cd.user_id
    WHERE mv.id=p_verification_id AND u.email_confirmed_at IS NOT NULL
      AND lower(split_part(u.email,'@',2))=mv.email_domain
  ) THEN RAISE EXCEPTION 'The current organization email must be confirmed before approval'; END IF;
  UPDATE public.mentor_verifications SET
    status=p_decision,
    canonical_company_name=CASE WHEN p_decision='approved' THEN trim(p_company_name) ELSE canonical_company_name END,
    rejection_reason=CASE WHEN p_decision='rejected' THEN trim(p_rejection_reason) ELSE NULL END,
    decided_at=now(), verified_at=CASE WHEN p_decision='approved' THEN now() ELSE NULL END,
    reviewed_by=auth.uid(), updated_at=now()
  WHERE id=p_verification_id RETURNING * INTO v_row;
  IF v_row.id IS NULL THEN RAISE EXCEPTION 'Verification not found'; END IF;
  SELECT cd.user_id, cd.full_name INTO v_recipient, v_name FROM public.counsellor_details cd WHERE cd.id=v_row.mentor_id;
  INSERT INTO public.mentorship_email_outbox(event_key, template_name, recipient_user_id, template_data)
  VALUES ('verification:' || v_row.id || ':' || p_decision || ':' || extract(epoch from v_row.updated_at),
    CASE WHEN p_decision='approved' THEN 'mentor-verification-approved' ELSE 'mentor-verification-not-approved' END,
    v_recipient, jsonb_build_object('mentorName', v_name, 'companyName', v_row.canonical_company_name, 'reason', v_row.rejection_reason, 'status', p_decision));
  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_mentorship_request_context(p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_request public.mentorship_requests; v_is_mentor boolean; v_result jsonb;
BEGIN
  SELECT mr.* INTO v_request FROM public.mentorship_requests mr WHERE mr.id=p_request_id;
  SELECT EXISTS (SELECT 1 FROM public.counsellor_details cd WHERE cd.id=v_request.mentor_id AND cd.user_id=auth.uid()) INTO v_is_mentor;
  IF v_request.id IS NULL OR (v_request.mentee_id<>auth.uid() AND NOT v_is_mentor) THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT to_jsonb(v_request) || jsonb_build_object(
    'resume', CASE WHEN v_request.resume_id IS NOT NULL AND (v_request.mentee_id=auth.uid() OR (v_is_mentor AND v_request.status IN ('accepted','completed')))
      THEN (SELECT to_jsonb(r) - 'user_id' FROM public.resumes r WHERE r.id=v_request.resume_id) ELSE NULL END,
    'application', CASE WHEN v_request.job_application_id IS NOT NULL THEN (
      SELECT jsonb_build_object('id',ja.id,'status',ja.status,'title',jp.title,'companyName',jp.company_name,'deadline',jp.application_deadline)
      FROM public.job_applications ja LEFT JOIN public.job_postings jp ON jp.id=ja.job_id WHERE ja.id=v_request.job_application_id
    ) ELSE NULL END,
    'contactEmail', CASE WHEN v_request.status IN ('accepted','completed') THEN (
      SELECT u.email FROM auth.users u WHERE u.id = CASE WHEN v_request.mentee_id=auth.uid() THEN (SELECT cd.user_id FROM public.counsellor_details cd WHERE cd.id=v_request.mentor_id) ELSE v_request.mentee_id END
    ) ELSE NULL END
  ) INTO v_result;
  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.list_mentor_profiles()
RETURNS SETOF public.mentor_profiles_public
LANGUAGE sql SECURITY INVOKER SET search_path = public
AS $$ SELECT * FROM public.mentor_profiles_public ORDER BY full_name $$;

CREATE OR REPLACE FUNCTION public.get_my_mentorship_requests()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC), '[]'::jsonb)
  FROM (
    SELECT mr.*, cd.full_name AS mentor_name, cd.current_role AS mentor_role,
      mv.canonical_company_name AS mentor_company,
      p.full_name AS mentee_name,
      r.title AS resume_title,
      jp.title AS application_title,
      jp.company_name AS application_company
    FROM public.mentorship_requests mr
    JOIN public.counsellor_details cd ON cd.id=mr.mentor_id
    LEFT JOIN public.mentor_verifications mv ON mv.mentor_id=mr.mentor_id
    LEFT JOIN public.profiles p ON p.id=mr.mentee_id
    LEFT JOIN public.resumes r ON r.id=mr.resume_id
    LEFT JOIN public.job_applications ja ON ja.id=mr.job_application_id
    LEFT JOIN public.job_postings jp ON jp.id=ja.job_id
    WHERE mr.mentee_id=auth.uid() OR cd.user_id=auth.uid()
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.get_my_mentor_profile()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT to_jsonb(x) FROM (
    SELECT cd.id AS mentor_id, cd.full_name, cd.avatar_url, cd.bio, cd.current_role,
      cd.expertise_tags, cd.years_experience, cd.availability_status,
      mv.id AS verification_id, mv.status AS verification_status,
      mv.claimed_organization, mv.canonical_company_name, mv.email_domain,
      mv.submitted_at, mv.verified_at, mv.rejection_reason
    FROM public.counsellor_details cd
    LEFT JOIN public.mentor_verifications mv ON mv.mentor_id=cd.id
    WHERE cd.user_id=auth.uid()
  ) x;
$$;

CREATE OR REPLACE FUNCTION public.update_my_mentor_profile(
  p_full_name text, p_current_role text, p_bio text, p_expertise_tags text[],
  p_years_experience integer, p_availability_status text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_row public.counsellor_details; v_tags text[];
BEGIN
  IF public.get_profile_user_type(auth.uid()) <> 'career_counsellor' THEN RAISE EXCEPTION 'Mentor profile required'; END IF;
  IF char_length(trim(p_full_name)) NOT BETWEEN 2 AND 100 THEN RAISE EXCEPTION 'Full name is required'; END IF;
  IF char_length(trim(p_current_role)) NOT BETWEEN 2 AND 120 THEN RAISE EXCEPTION 'Current role is required'; END IF;
  IF char_length(trim(p_bio)) NOT BETWEEN 20 AND 1000 THEN RAISE EXCEPTION 'Bio must be between 20 and 1000 characters'; END IF;
  IF p_years_experience NOT BETWEEN 0 AND 60 OR p_availability_status NOT IN ('accepting','limited','paused') THEN RAISE EXCEPTION 'Invalid profile details'; END IF;
  SELECT array_agg(DISTINCT trim(tag)) INTO v_tags FROM unnest(p_expertise_tags) tag WHERE trim(tag)<>'';
  IF coalesce(cardinality(v_tags),0) NOT BETWEEN 1 AND 12 THEN RAISE EXCEPTION 'Add between 1 and 12 expertise tags'; END IF;
  UPDATE public.counsellor_details SET full_name=trim(p_full_name), current_role=trim(p_current_role),
    bio=trim(p_bio), expertise_tags=v_tags,
    years_experience=p_years_experience, availability_status=p_availability_status, updated_at=now()
  WHERE user_id=auth.uid() RETURNING * INTO v_row;
  UPDATE public.profiles SET full_name=v_row.full_name WHERE id=auth.uid();
  RETURN to_jsonb(v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_mentor_verifications()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth
AS $$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.submitted_at DESC), '[]'::jsonb) INTO v_result FROM (
    SELECT mv.*, cd.full_name, cd.current_role, cd.bio, cd.expertise_tags, cd.years_experience,
      u.email AS organization_email
    FROM public.mentor_verifications mv
    JOIN public.counsellor_details cd ON cd.id=mv.mentor_id
    JOIN auth.users u ON u.id=cd.user_id
  ) x;
  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_mentor_verification(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_mentorship_request(uuid,text,text,text,date,text,uuid,uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.respond_to_mentorship_request(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_mentorship_request_status(uuid,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_mentor_verification(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_mentorship_request_context(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_mentor_profiles() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_mentorship_requests() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_mentor_profile() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_my_mentor_profile(text,text,text,text[],integer,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_mentor_verifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_mentor_verification(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_mentorship_request(uuid,text,text,text,date,text,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_to_mentorship_request(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_mentorship_request_status(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mentor_verification(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mentorship_request_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_mentor_profiles() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_mentorship_requests() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_mentor_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_mentor_profile(text,text,text,text[],integer,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_mentor_verifications() TO authenticated;

-- Fire-and-forget the service-only outbox processor after each lifecycle event.
-- If the existing email-infrastructure vault secret is temporarily unavailable,
-- the row remains pending and can be retried by invoking the processor later.
CREATE OR REPLACE FUNCTION public.kick_mentorship_email_outbox()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, vault, extensions
AS $$
DECLARE v_service_key text;
BEGIN
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets
  WHERE name='email_queue_service_role_key' LIMIT 1;
  IF v_service_key IS NOT NULL THEN
    PERFORM net.http_post(
      url := 'https://fsorkxlcasekndigezlx.supabase.co/functions/v1/process-mentorship-email-outbox',
      headers := jsonb_build_object('Authorization', 'Bearer ' || v_service_key, 'Content-Type', 'application/json'),
      body := '{}'::jsonb
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;
CREATE TRIGGER mentorship_email_outbox_kick
AFTER INSERT ON public.mentorship_email_outbox
FOR EACH STATEMENT EXECUTE FUNCTION public.kick_mentorship_email_outbox();
REVOKE ALL ON FUNCTION public.kick_mentorship_email_outbox() FROM PUBLIC, anon, authenticated;

-- Retry rows that could not be handed to the existing transactional queue.
DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('process-mentorship-email-outbox'); EXCEPTION WHEN OTHERS THEN NULL; END;
  PERFORM cron.schedule(
    'process-mentorship-email-outbox',
    '*/5 * * * *',
    $job$
      SELECT net.http_post(
        url := 'https://fsorkxlcasekndigezlx.supabase.co/functions/v1/process-mentorship-email-outbox',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='email_queue_service_role_key' LIMIT 1),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
    $job$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Mentorship outbox cron was not installed; deploy it through the supported Lovable scheduler: %', SQLERRM;
END $$;

-- Existing mentors enter the new system as unverified and remain hidden until review.
INSERT INTO public.mentor_verifications (mentor_id, email_domain, claimed_organization, status)
SELECT cd.id, coalesce(lower(split_part(u.email, '@', 2)), 'unavailable.invalid'), left(coalesce(nullif(cd.specialization,''), 'Organization not supplied'),160), 'pending'
FROM public.counsellor_details cd JOIN auth.users u ON u.id=cd.user_id
ON CONFLICT (mentor_id) DO NOTHING;
