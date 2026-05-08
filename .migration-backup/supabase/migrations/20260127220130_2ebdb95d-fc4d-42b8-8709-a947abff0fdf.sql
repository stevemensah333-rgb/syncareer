-- Fix: Restrict public access to counsellor_details to hide phone numbers
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view counsellor public profiles" ON public.counsellor_details;

-- Create a more restrictive policy: users can only view full details if they have a booking with the counsellor
-- OR if they are the counsellor themselves
CREATE POLICY "Users can view counsellor details with booking relationship" 
ON public.counsellor_details 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM counsellor_bookings cb 
    WHERE cb.counsellor_id = counsellor_details.id 
    AND cb.user_id = auth.uid()
  )
);

-- Note: The counsellor_profiles_public VIEW already excludes sensitive fields (phone_number, country_code)
-- and should be used for public browsing of counsellor profiles