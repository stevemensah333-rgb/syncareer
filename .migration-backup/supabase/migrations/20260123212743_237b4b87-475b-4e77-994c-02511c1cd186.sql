-- Fix: Require authentication to view counsellor profiles
-- This protects phone numbers from being scraped by unauthenticated users

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Anyone can view counsellor profiles" ON counsellor_details;

-- Create a new policy that requires authentication
CREATE POLICY "Authenticated users can view counsellor profiles" 
  ON counsellor_details 
  FOR SELECT 
  USING (auth.role() = 'authenticated');