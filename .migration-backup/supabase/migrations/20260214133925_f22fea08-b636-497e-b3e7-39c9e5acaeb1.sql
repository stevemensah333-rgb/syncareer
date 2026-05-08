-- Allow authenticated users to view counsellor details via the public view
CREATE POLICY "Authenticated users can view counsellor profiles"
ON public.counsellor_details FOR SELECT
USING (auth.role() = 'authenticated');