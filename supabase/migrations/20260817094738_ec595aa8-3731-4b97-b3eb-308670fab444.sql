-- 1. Drop the dead/misfiring counsellor profile visibility policy.
-- Counsellor discovery is served by public.counsellor_profiles_public.
DROP POLICY IF EXISTS "Authenticated users can view counsellor profiles" ON public.profiles;

-- 2. Job postings: never let a NULL employer_id satisfy the ownership check,
-- and restrict the policy to authenticated users.
DROP POLICY IF EXISTS "Employers can manage their job postings" ON public.job_postings;
CREATE POLICY "Employers can manage their job postings"
ON public.job_postings
FOR ALL
TO authenticated
USING (employer_id IS NOT NULL AND auth.uid() = employer_id)
WITH CHECK (employer_id IS NOT NULL AND auth.uid() = employer_id);

-- 3. Remove the redundant public read policy on the avatars bucket.
DROP POLICY IF EXISTS "Public can read avatar files" ON storage.objects;