
-- 1. Lock down SECURITY DEFINER functions from anon
REVOKE EXECUTE ON FUNCTION public.email_queue_wake() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_profile_user_type(uuid) FROM PUBLIC, anon;

-- 2. counsellor_details: restrict INSERT to users whose profile is a counsellor
DROP POLICY IF EXISTS "Users can insert own counsellor details" ON public.counsellor_details;
CREATE POLICY "Users can insert own counsellor details"
  ON public.counsellor_details
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND public.get_profile_user_type(auth.uid()) = 'counsellor'
  );

-- 3. counsellor_sessions: prevent client escalation of payment_status/amount_paid
CREATE OR REPLACE FUNCTION public.prevent_client_payment_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role bypasses this check
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Counsellor owner may update payment fields; clients may not
  IF public.is_counsellor_owner(NEW.counsellor_id) THEN
    RETURN NEW;
  END IF;
  IF NEW.payment_status IS DISTINCT FROM OLD.payment_status
     OR NEW.amount_paid IS DISTINCT FROM OLD.amount_paid THEN
    RAISE EXCEPTION 'Only the counsellor or system may change payment_status or amount_paid';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS counsellor_sessions_prevent_payment_escalation ON public.counsellor_sessions;
CREATE TRIGGER counsellor_sessions_prevent_payment_escalation
  BEFORE UPDATE ON public.counsellor_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_client_payment_escalation();

-- Simplify client UPDATE policy (trigger now guarantees payment fields cannot change)
DROP POLICY IF EXISTS "Clients can cancel their sessions" ON public.counsellor_sessions;
CREATE POLICY "Clients can cancel their sessions"
  ON public.counsellor_sessions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = client_id)
  WITH CHECK (
    auth.uid() = client_id
    AND status = ANY (ARRAY['scheduled'::text, 'cancelled'::text])
  );

-- 4. portfolio_settings: owner-only SELECT; expose non-sensitive fields via public view
DROP POLICY IF EXISTS "Authenticated users can view portfolio settings" ON public.portfolio_settings;
CREATE POLICY "Owner can view own portfolio settings"
  ON public.portfolio_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE VIEW public.public_portfolio_settings
WITH (security_invoker = false)
AS
SELECT
  user_id,
  template,
  accent_color,
  headline,
  subheadline,
  available_for,
  cv_url,
  og_image_url,
  external_portfolio_url,
  created_at,
  updated_at
FROM public.portfolio_settings;

GRANT SELECT ON public.public_portfolio_settings TO anon, authenticated;
