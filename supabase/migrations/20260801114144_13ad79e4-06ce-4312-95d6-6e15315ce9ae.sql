DROP POLICY IF EXISTS "Public video access" ON storage.objects;

DROP POLICY IF EXISTS "Owners can read their own videos" ON storage.objects;
CREATE POLICY "Owners can read their own videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);