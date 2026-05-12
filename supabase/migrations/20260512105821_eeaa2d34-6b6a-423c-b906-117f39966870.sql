CREATE POLICY "Anyone can view public profile fields"
ON public.profiles FOR SELECT
USING (true);