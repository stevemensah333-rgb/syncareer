
-- Profiles: restrict public read to authenticated only
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Portfolio settings: restrict public read to authenticated only
DROP POLICY IF EXISTS "Anyone can view portfolio settings" ON public.portfolio_settings;
CREATE POLICY "Authenticated users can view portfolio settings"
ON public.portfolio_settings FOR SELECT
TO authenticated
USING (true);

-- Counsellor sessions: split overly-permissive ALL policy
DROP POLICY IF EXISTS "Clients can view and manage their sessions" ON public.counsellor_sessions;
CREATE POLICY "Clients can view their sessions"
ON public.counsellor_sessions FOR SELECT
USING (auth.uid() = client_id);
CREATE POLICY "Clients can book sessions"
ON public.counsellor_sessions FOR INSERT
WITH CHECK (auth.uid() = client_id AND payment_status = 'pending' AND status = 'scheduled');
CREATE POLICY "Clients can cancel their sessions"
ON public.counsellor_sessions FOR UPDATE
USING (auth.uid() = client_id)
WITH CHECK (
  auth.uid() = client_id
  AND status IN ('scheduled','cancelled')
  AND payment_status IS NOT DISTINCT FROM (SELECT cs.payment_status FROM public.counsellor_sessions cs WHERE cs.id = counsellor_sessions.id)
  AND amount_paid IS NOT DISTINCT FROM (SELECT cs.amount_paid FROM public.counsellor_sessions cs WHERE cs.id = counsellor_sessions.id)
);

-- Payments: enforce that client-inserted payments start as 'pending'
DROP POLICY IF EXISTS "Users can insert own payments" ON public.payments;
CREATE POLICY "Users can insert own pending payments"
ON public.payments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');

-- Lock search_path on pgmq helper functions and revoke anon execute
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;

REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
