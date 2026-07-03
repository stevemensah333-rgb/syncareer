
-- 1) counsellor_bookings: prevent updates to immutable/ownership fields
CREATE OR REPLACE FUNCTION public.enforce_counsellor_booking_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_service boolean := current_setting('request.jwt.claim.role', true) = 'service_role';
BEGIN
  IF is_service THEN
    RETURN NEW;
  END IF;

  IF NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.counsellor_id IS DISTINCT FROM OLD.counsellor_id THEN
    RAISE EXCEPTION 'user_id and counsellor_id cannot be modified after booking';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_counsellor_booking_updates() FROM PUBLIC;

DROP TRIGGER IF EXISTS counsellor_bookings_enforce_updates ON public.counsellor_bookings;
CREATE TRIGGER counsellor_bookings_enforce_updates
BEFORE UPDATE ON public.counsellor_bookings
FOR EACH ROW EXECUTE FUNCTION public.enforce_counsellor_booking_updates();

-- Recreate UPDATE policy with a WITH CHECK that pins ownership
DROP POLICY IF EXISTS "Users can update bookings" ON public.counsellor_bookings;
CREATE POLICY "Users can update bookings"
ON public.counsellor_bookings
FOR UPDATE
USING (
  (auth.uid() = user_id)
  OR (auth.uid() IN (SELECT counsellor_details.user_id FROM counsellor_details WHERE counsellor_details.id = counsellor_bookings.counsellor_id))
)
WITH CHECK (
  (auth.uid() = user_id)
  OR (auth.uid() IN (SELECT counsellor_details.user_id FROM counsellor_details WHERE counsellor_details.id = counsellor_bookings.counsellor_id))
);

-- 2) counsellor_sessions: tighten client UPDATE policy WITH CHECK
DROP POLICY IF EXISTS "Clients can cancel their sessions" ON public.counsellor_sessions;
CREATE POLICY "Clients can cancel their sessions"
ON public.counsellor_sessions
FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND status = 'cancelled'
);
-- Note: the existing enforce_counsellor_session_updates trigger blocks changes
-- to payment_status, amount_paid, and any non-status column for clients.

-- 3) referrals: remove client UPDATE policy entirely.
-- Reward grants must go through service_role (edge function), which bypasses RLS.
DROP POLICY IF EXISTS "System can update referrals" ON public.referrals;

-- 4) profiles.referral_code: remove column from any authenticated/anon SELECT
--    so counsellor-profile visibility cannot leak referral codes to other users.
REVOKE SELECT (referral_code) ON public.profiles FROM authenticated;
REVOKE SELECT (referral_code) ON public.profiles FROM anon;
-- Owners fetch their own code via a SECURITY DEFINER RPC:
CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT referral_code
  FROM public.profiles
  WHERE id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.get_my_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_referral_code() TO authenticated;

-- 5) SECURITY DEFINER hardening: revoke PUBLIC EXECUTE on all definer
--    functions so only explicitly-granted roles can call them.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
  END LOOP;
END $$;

-- Also revoke anon from definer functions that should not be publicly callable.
-- Keep anon on get_public_portfolio_settings (intentional public read) only.
REVOKE EXECUTE ON FUNCTION public.get_profile_user_type(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_counsellor_owner(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.user_has_counsellor_booking(uuid) FROM anon;
