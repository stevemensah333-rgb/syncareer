
-- 1. profiles_public_readable: remove broad "true" SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- 2. profiles_user_type_update_bypass: prevent user_type self-assignment via update
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND user_type IS NOT DISTINCT FROM public.get_profile_user_type(auth.uid())
  );

-- Also block INSERT setting privileged user_type; enforce NULL/self-serve default
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  WITH CHECK (
    auth.uid() = id
    AND (user_type IS NULL OR user_type = 'student')
  );

-- 3 & 4. counsellor_sessions: restrict client updates to status='cancelled' only,
-- and block anyone except service_role from changing payment_status / amount_paid.
DROP POLICY IF EXISTS "Clients can cancel their sessions" ON public.counsellor_sessions;
DROP POLICY IF EXISTS "Counsellors can manage their sessions" ON public.counsellor_sessions;

CREATE POLICY "Counsellors can view their sessions" ON public.counsellor_sessions
  FOR SELECT USING (public.is_counsellor_owner(counsellor_id));

CREATE POLICY "Counsellors can update their sessions" ON public.counsellor_sessions
  FOR UPDATE
  USING (public.is_counsellor_owner(counsellor_id))
  WITH CHECK (public.is_counsellor_owner(counsellor_id));

CREATE POLICY "Counsellors can delete their sessions" ON public.counsellor_sessions
  FOR DELETE USING (public.is_counsellor_owner(counsellor_id));

CREATE POLICY "Clients can cancel their sessions" ON public.counsellor_sessions
  FOR UPDATE
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id AND status = 'cancelled');

-- Column-level enforcement via trigger (replaces prevent_client_payment_escalation).
CREATE OR REPLACE FUNCTION public.enforce_counsellor_session_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
  is_counsellor boolean := public.is_counsellor_owner(NEW.counsellor_id);
  is_client boolean := auth.uid() = NEW.client_id;
BEGIN
  IF is_service THEN
    RETURN NEW;
  END IF;

  -- Payment fields: only service_role (payment webhook) may change these.
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
    RAISE EXCEPTION 'payment_status and amount_paid can only be changed by the payment system';
  END IF;

  -- Clients (non-owner) may only cancel: no other column may change.
  IF is_client AND NOT is_counsellor THEN
    IF NEW.counsellor_id IS DISTINCT FROM OLD.counsellor_id
       OR NEW.client_id IS DISTINCT FROM OLD.client_id
       OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
       OR NEW.duration_minutes IS DISTINCT FROM OLD.duration_minutes
       OR NEW.meeting_link IS DISTINCT FROM OLD.meeting_link
       OR NEW.session_notes IS DISTINCT FROM OLD.session_notes THEN
      RAISE EXCEPTION 'Clients may only update the status column to cancel a session';
    END IF;
    IF NEW.status <> 'cancelled' THEN
      RAISE EXCEPTION 'Clients may only set status to cancelled';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS counsellor_sessions_prevent_payment_escalation ON public.counsellor_sessions;
DROP TRIGGER IF EXISTS counsellor_sessions_enforce_updates ON public.counsellor_sessions;
CREATE TRIGGER counsellor_sessions_enforce_updates
  BEFORE UPDATE ON public.counsellor_sessions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_counsellor_session_updates();

-- 5. SUPA_anon_security_definer_function_executable: lock down definer functions
REVOKE EXECUTE ON FUNCTION public.prevent_client_payment_escalation() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_counsellor_session_updates() FROM PUBLIC, anon, authenticated;

-- 6. portfolio_settings_contact_email_exposure: already owner-only SELECT.
-- Reassert to make the intent explicit and confirm no anon SELECT exists.
DROP POLICY IF EXISTS "Public can view portfolio settings" ON public.portfolio_settings;
DROP POLICY IF EXISTS "Anyone can view portfolio settings" ON public.portfolio_settings;
