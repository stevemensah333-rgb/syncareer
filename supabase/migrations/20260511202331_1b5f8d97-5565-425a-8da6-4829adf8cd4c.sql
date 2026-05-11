
DROP POLICY IF EXISTS "Anyone can view counsellor profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view counsellor profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_type = 'counsellor');

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      user_type IS NOT DISTINCT FROM (SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid())
      OR (SELECT p.user_type FROM public.profiles p WHERE p.id = auth.uid()) IS NULL
    )
  );

DROP POLICY IF EXISTS "Users can update own payments" ON public.payments;

DROP POLICY IF EXISTS "Anyone can view endorsements" ON public.skill_endorsements;
CREATE POLICY "Authenticated users can view endorsements"
  ON public.skill_endorsements FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view counsellor reviews" ON public.counsellor_reviews;
CREATE POLICY "Authenticated users can view counsellor reviews"
  ON public.counsellor_reviews FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Anyone can view counsellor availability" ON public.counsellor_availability;
CREATE POLICY "Authenticated users can view counsellor availability"
  ON public.counsellor_availability FOR SELECT TO authenticated
  USING (is_available = true);

DROP POLICY IF EXISTS "Anyone can view active job postings" ON public.job_postings;
CREATE POLICY "Authenticated users can view active job postings"
  ON public.job_postings FOR SELECT TO authenticated
  USING (status = 'active');
