
-- Fix community-assets bucket: add file size limit and MIME type restrictions
UPDATE storage.buckets 
SET file_size_limit = 10485760,  -- 10MB
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/webm'
    ]
WHERE id = 'community-assets';

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can upload community assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own community assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own community assets" ON storage.objects;

-- Add folder-based ownership policies
CREATE POLICY "Users can upload to own folder in community assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-assets'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own files in community assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own files in community assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-assets'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
