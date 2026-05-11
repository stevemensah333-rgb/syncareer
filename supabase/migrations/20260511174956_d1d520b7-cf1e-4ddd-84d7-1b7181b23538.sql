
-- 1. Add explicit INSERT/UPDATE/DELETE policies on payments to prevent users from creating payments for others
CREATE POLICY "Users can insert own payments"
ON public.payments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own payments"
ON public.payments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Revoke EXECUTE from anon on SECURITY DEFINER helper functions.
-- These are only needed inside RLS policies for authenticated users.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_counsellor_owner(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.user_has_counsellor_booking(uuid) FROM anon, PUBLIC;
