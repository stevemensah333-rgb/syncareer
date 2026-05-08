-- Fix: Remove the overly permissive policy that exposes phone numbers
-- The counsellor_profiles_public view already excludes sensitive fields
-- and should be used for public access instead of direct table access

DROP POLICY IF EXISTS "Anyone can view counsellor public profiles" ON public.counsellor_details;

-- Keep only the owner policy for direct table access
-- Public access should go through counsellor_profiles_public view