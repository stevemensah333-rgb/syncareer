-- Fix: Restrict vote visibility to users viewing only their own votes
-- This protects user privacy by preventing vote pattern analysis

DROP POLICY IF EXISTS "Anyone can view votes" ON public.community_post_votes;

CREATE POLICY "Users can view own votes" ON public.community_post_votes
  FOR SELECT USING (auth.uid() = user_id);
