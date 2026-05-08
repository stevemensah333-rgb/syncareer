-- Fix community_members exposure: Change from public to authenticated-only access
-- This prevents anonymous scraping of user activity patterns while maintaining functionality for logged-in users

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Anyone can view community members" ON public.community_members;

-- Create a more restrictive policy - only authenticated users can view
CREATE POLICY "Authenticated users can view community members" 
ON public.community_members 
FOR SELECT 
USING (auth.role() = 'authenticated');