-- Fix 1: Restrict profiles table - remove broad authenticated access, keep specific policies
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

-- Owner can always view own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Counsellors need to be publicly discoverable (browsable by students)
CREATE POLICY "Anyone can view counsellor profiles"
  ON public.profiles
  FOR SELECT
  USING (
    user_type = 'counsellor'
  );

-- Fix 2: Add file size and type limits to avatars bucket
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'avatars';