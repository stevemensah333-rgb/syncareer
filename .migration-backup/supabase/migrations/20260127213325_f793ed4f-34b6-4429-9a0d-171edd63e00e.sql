-- Add a policy to allow viewing basic profile data for any user (needed for displaying author info on posts)
CREATE POLICY "Anyone can view public profile fields" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Drop the restrictive "Users can view own profile" policy as it's now redundant with the broader policy
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;