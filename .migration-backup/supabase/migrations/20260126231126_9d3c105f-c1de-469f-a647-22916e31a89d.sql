-- Create storage bucket for community assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('community-assets', 'community-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload community assets
CREATE POLICY "Authenticated users can upload community assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-assets' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to community assets
CREATE POLICY "Public can view community assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-assets');

-- Allow users to update their own uploads
CREATE POLICY "Users can update own community assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own community assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-assets' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);