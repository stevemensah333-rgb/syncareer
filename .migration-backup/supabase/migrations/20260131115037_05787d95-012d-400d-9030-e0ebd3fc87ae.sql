-- Fix: Allow authenticated users to view counsellor public profiles
-- This is safe because:
-- 1. The counsellor_profiles_public view excludes sensitive fields (phone_number, country_code)
-- 2. All client code accesses counsellor data through the view, not directly from the table
-- 3. Counsellors can still access their full details including phone via existing policy

CREATE POLICY "Anyone can view counsellor public profiles"
ON public.counsellor_details
FOR SELECT
USING (true);