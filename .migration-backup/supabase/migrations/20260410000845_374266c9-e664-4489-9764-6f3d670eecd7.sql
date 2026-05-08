-- Fix 1: Restrict skill_question_bank so clients can't read correct answers
DROP POLICY IF EXISTS "Authenticated users can read questions" ON public.skill_question_bank;

-- Only admins can directly read the question bank
CREATE POLICY "Only admins can read question bank"
ON public.skill_question_bank
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Fix 2: Remove broad counsellor_details SELECT policy that exposes phone numbers
DROP POLICY IF EXISTS "Authenticated users can view counsellor profiles" ON public.counsellor_details;

-- Allow users with a booking to see counsellor name and meeting link
CREATE POLICY "Booking users can view counsellor details"
ON public.counsellor_details
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
  OR public.user_has_counsellor_booking(id)
);