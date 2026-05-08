-- Create a public view for bookings that hides sensitive contact information
-- This view is used for general queries; counsellors access their own bookings' contact info via the base table
CREATE VIEW public.counsellor_bookings_public
WITH (security_invoker = on) AS
SELECT 
  id,
  counsellor_id,
  user_id,
  user_name,
  status,
  created_at,
  updated_at
FROM public.counsellor_bookings;

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Users can view own bookings" ON public.counsellor_bookings;

-- Create separate policies for users viewing their own bookings (with contact info)
-- and counsellors viewing bookings for their sessions (with contact info)
-- Both need full access to their relevant bookings

-- Policy 1: Users can view their own bookings (they created them, so they know their own contact)
CREATE POLICY "Users can view own bookings"
ON public.counsellor_bookings
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Counsellors can view bookings for their sessions (they need contact info to reach out)
CREATE POLICY "Counsellors can view their session bookings"
ON public.counsellor_bookings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.counsellor_details cd
    WHERE cd.id = counsellor_bookings.counsellor_id
    AND cd.user_id = auth.uid()
  )
);