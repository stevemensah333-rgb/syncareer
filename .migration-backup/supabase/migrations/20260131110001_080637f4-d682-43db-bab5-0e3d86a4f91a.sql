-- Fix 1: Profiles table - Require authentication to view profiles
-- Drop the overly permissive public access policy
DROP POLICY IF EXISTS "Anyone can view public profile fields" ON profiles;

-- Create new policy requiring authentication for profile viewing
-- Users must be authenticated to view any profiles
CREATE POLICY "Authenticated users can view profiles"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- Fix 2: Counsellor Details - Remove phone number exposure to booking users
-- The counsellor_profiles_public view already excludes phone/country_code
-- We need to restrict direct table access to only the owner

-- Drop the current policy that exposes data to booking users
DROP POLICY IF EXISTS "Users can view counsellor details" ON counsellor_details;

-- Create a more restrictive policy - only the counsellor owner can view their own details
-- Public profile data should be accessed via the counsellor_profiles_public view
CREATE POLICY "Counsellors can view own details"
  ON counsellor_details FOR SELECT
  USING (auth.uid() = user_id);