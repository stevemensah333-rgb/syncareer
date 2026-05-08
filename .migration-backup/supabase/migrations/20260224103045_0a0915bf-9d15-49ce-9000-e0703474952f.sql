
-- Remove community-related columns from notification_preferences
ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS community_posts;
ALTER TABLE public.notification_preferences DROP COLUMN IF EXISTS community_replies;
