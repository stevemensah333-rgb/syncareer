
-- Create community_bans table for tracking banned users per community
CREATE TABLE public.community_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(community_id, user_id)
);

-- Enable RLS
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;

-- Admins/mods can view bans in their communities
CREATE POLICY "Admins can view community bans"
  ON public.community_bans
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
  );

-- Admins/mods can create bans
CREATE POLICY "Admins can ban users"
  ON public.community_bans
  FOR INSERT
  WITH CHECK (
    auth.uid() = banned_by
    AND EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
  );

-- Admins/mods can remove bans
CREATE POLICY "Admins can unban users"
  ON public.community_bans
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_members cm
      WHERE cm.community_id = community_bans.community_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('admin', 'moderator')
    )
  );

-- Users can check if they are banned (needed to show ban messages)
CREATE POLICY "Users can view own bans"
  ON public.community_bans
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add index for fast ban lookups
CREATE INDEX idx_community_bans_lookup ON public.community_bans(community_id, user_id);
