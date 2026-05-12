-- Extend portfolio_projects with case-study fields
ALTER TABLE public.portfolio_projects
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS cover_image_url TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS problem TEXT,
  ADD COLUMN IF NOT EXISTS approach TEXT,
  ADD COLUMN IF NOT EXISTS outcome TEXT,
  ADD COLUMN IF NOT EXISTS tech_stack TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS screenshots TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS lessons_learned TEXT,
  ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS portfolio_projects_user_slug_key
  ON public.portfolio_projects (user_id, slug)
  WHERE slug IS NOT NULL;

-- Portfolio settings (one per user)
CREATE TABLE IF NOT EXISTS public.portfolio_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  template TEXT NOT NULL DEFAULT 'minimal',
  accent_color TEXT DEFAULT '#0FB5B5',
  font_pair TEXT DEFAULT 'inter-playfair',
  headline TEXT,
  subheadline TEXT,
  contact_email TEXT,
  available_for TEXT,
  cv_url TEXT,
  og_image_url TEXT,
  external_portfolio_url TEXT,
  figma_tokens JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view portfolio settings"
  ON public.portfolio_settings FOR SELECT USING (true);

CREATE POLICY "Owner can insert own portfolio settings"
  ON public.portfolio_settings FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own portfolio settings"
  ON public.portfolio_settings FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own portfolio settings"
  ON public.portfolio_settings FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_portfolio_settings_updated_at
  BEFORE UPDATE ON public.portfolio_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Portfolio views analytics
CREATE TABLE IF NOT EXISTS public.portfolio_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  referrer TEXT,
  country TEXT,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS portfolio_views_owner_idx
  ON public.portfolio_views (owner_user_id, viewed_at DESC);

ALTER TABLE public.portfolio_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a portfolio view"
  ON public.portfolio_views FOR INSERT WITH CHECK (true);

CREATE POLICY "Owner can view own analytics"
  ON public.portfolio_views FOR SELECT TO authenticated
  USING (auth.uid() = owner_user_id);