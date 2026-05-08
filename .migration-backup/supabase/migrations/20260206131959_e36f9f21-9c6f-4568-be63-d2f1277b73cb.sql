
-- Content Reports table for post/comment reporting
CREATE TABLE public.content_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('post', 'comment')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'misinformation', 'inappropriate', 'self_harm', 'other')),
  description TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (one per user per content)
CREATE POLICY "Users can create reports"
ON public.content_reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- Users can view their own reports
CREATE POLICY "Users can view own reports"
ON public.content_reports
FOR SELECT
USING (auth.uid() = reporter_id);

-- Community admins can view reports for posts in their communities
CREATE POLICY "Admins can view reports in their communities"
ON public.content_reports
FOR SELECT
USING (
  content_type = 'post' AND EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN community_members cm ON cm.community_id = cp.community_id
    WHERE cp.id = content_reports.content_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Community admins can update reports (review/resolve)
CREATE POLICY "Admins can update reports in their communities"
ON public.content_reports
FOR UPDATE
USING (
  content_type = 'post' AND EXISTS (
    SELECT 1 FROM community_posts cp
    JOIN community_members cm ON cm.community_id = cp.community_id
    WHERE cp.id = content_reports.content_id
    AND cm.user_id = auth.uid()
    AND cm.role IN ('admin', 'moderator')
  )
);

-- Prevent duplicate reports
CREATE UNIQUE INDEX idx_unique_report ON public.content_reports (reporter_id, content_type, content_id);

-- Index for fast lookups
CREATE INDEX idx_reports_content ON public.content_reports (content_type, content_id);
CREATE INDEX idx_reports_status ON public.content_reports (status) WHERE status = 'pending';
