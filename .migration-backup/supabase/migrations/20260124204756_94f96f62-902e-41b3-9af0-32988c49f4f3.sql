-- Drop legacy feed/networking tables (posts, post_likes, post_comments, user_connections)
-- These are replaced by community_posts and related tables

-- First drop foreign key references
DROP TABLE IF EXISTS public.post_likes CASCADE;
DROP TABLE IF EXISTS public.post_comments CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;
DROP TABLE IF EXISTS public.user_connections CASCADE;