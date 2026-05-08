-- =========================================================================
-- 1) Counsellor details: drop the leaky "booking users" policy
-- =========================================================================
DROP POLICY IF EXISTS "Booking users can view limited counsellor info" ON public.counsellor_details;

-- =========================================================================
-- 2) Realtime: restrict channel subscriptions to per-user notification topics
-- =========================================================================
-- Enable RLS on realtime.messages (no-op if already enabled)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing custom policies so this migration is idempotent
DROP POLICY IF EXISTS "Users can subscribe to own notification topic" ON realtime.messages;
DROP POLICY IF EXISTS "Users can read own notification topic" ON realtime.messages;

-- Allow authenticated users to subscribe to / receive messages only on
-- the topic that matches their own user id (e.g. `notifications:<uid>`).
CREATE POLICY "Users can read own notification topic"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = 'notifications:' || auth.uid()::text
);

-- =========================================================================
-- 3) Videos storage bucket: scope writes to owner folder, drop bulk listing
-- =========================================================================
-- Remove any pre-existing permissive listing/insert policies for this bucket
DROP POLICY IF EXISTS "Public can list videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list videos" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read videos" ON storage.objects;

-- Public READ on individual file paths (still works with the existing public
-- demo video URL), but does not grant LIST since callers must know the path.
CREATE POLICY "Public read videos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'videos');

-- Authenticated users can upload videos only under their own user id folder
CREATE POLICY "Users can upload own videos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can update only their own files
CREATE POLICY "Users can update own videos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Authenticated users can delete only their own files
CREATE POLICY "Users can delete own videos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'videos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);