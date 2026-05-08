-- Create a security definer function to check if user has a booking with a counsellor
-- This avoids infinite recursion in RLS policies
CREATE OR REPLACE FUNCTION public.user_has_counsellor_booking(counsellor_details_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM counsellor_bookings cb
    WHERE cb.counsellor_id = counsellor_details_id
      AND cb.user_id = auth.uid()
  )
$$;

-- Drop the problematic policies that cause recursion
DROP POLICY IF EXISTS "Users can view counsellor details with booking relationship" ON counsellor_details;
DROP POLICY IF EXISTS "Users can view own counsellor details" ON counsellor_details;

-- Create a single SELECT policy using the security definer function
CREATE POLICY "Users can view counsellor details"
  ON counsellor_details
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR public.user_has_counsellor_booking(id)
  );

-- Also need to fix the counsellor_availability policy that may have same issue
DROP POLICY IF EXISTS "Counsellors can manage their availability" ON counsellor_availability;

-- Create security definer function to check if user is counsellor owner
CREATE OR REPLACE FUNCTION public.is_counsellor_owner(counsellor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM counsellor_details cd
    WHERE cd.id = counsellor_id
      AND cd.user_id = auth.uid()
  )
$$;

-- Recreate counsellor_availability policy using the function
CREATE POLICY "Counsellors can manage their availability"
  ON counsellor_availability
  FOR ALL
  USING (public.is_counsellor_owner(counsellor_id));

-- Fix counsellor_sessions policy 
DROP POLICY IF EXISTS "Counsellors can manage their sessions" ON counsellor_sessions;

CREATE POLICY "Counsellors can manage their sessions"
  ON counsellor_sessions
  FOR ALL
  USING (public.is_counsellor_owner(counsellor_id));