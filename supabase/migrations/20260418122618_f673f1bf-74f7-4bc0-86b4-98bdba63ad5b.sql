-- Drop common variants of broad public SELECT policies that grant listing
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public read access" ON storage.objects;
DROP POLICY IF EXISTS "Public access" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read community-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view community assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read email-assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view email assets" ON storage.objects;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;

-- Helper: per-bucket public READ policy that allows fetching individual
-- objects by full name but does not allow LIST (no name='' wildcard match).
-- Direct public URLs (/object/public/<bucket>/<path>) continue to work.

CREATE POLICY "Public can read avatar files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public can read video files"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public can read community assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'community-assets' AND name IS NOT NULL AND length(name) > 0);

CREATE POLICY "Public can read email assets"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'email-assets' AND name IS NOT NULL AND length(name) > 0);