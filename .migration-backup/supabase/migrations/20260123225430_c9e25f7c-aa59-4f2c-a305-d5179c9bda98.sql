-- Create a public view for counsellor profiles that excludes sensitive contact information
-- This view is used for browsing counsellors; contact info is only shown to counsellor themselves
CREATE VIEW public.counsellor_profiles_public
WITH (security_invoker = on) AS
SELECT 
  id,
  user_id,
  full_name,
  bio,
  specialization,
  hiring_price,
  location,
  avatar_url,
  created_at,
  updated_at
FROM public.counsellor_details;

-- Drop the overly permissive policy that exposes all data to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view counsellor profiles" ON public.counsellor_details;

-- The existing "Users can view own counsellor details" policy already exists,
-- which allows counsellors to see their own full profile including phone numbers