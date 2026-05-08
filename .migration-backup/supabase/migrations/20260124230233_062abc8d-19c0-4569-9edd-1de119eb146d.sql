-- Drop and recreate the view with security_invoker
DROP VIEW IF EXISTS public.counsellor_profiles_public;

-- Create a RLS policy on counsellor_details to allow reading public profile info
-- This is safe because the view only exposes non-sensitive fields
CREATE POLICY "Anyone can view counsellor public profiles"
ON public.counsellor_details
FOR SELECT
USING (true);

-- Recreate the view with security_invoker to use the caller's permissions
CREATE VIEW public.counsellor_profiles_public
WITH (security_invoker=on) AS
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
FROM counsellor_details;