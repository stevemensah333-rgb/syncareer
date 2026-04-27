-- Cache for free learning resources (YouTube + curated)
CREATE TABLE public.cached_free_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_name text NOT NULL,
  career_path text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  UNIQUE (skill_name, career_path)
);

CREATE INDEX idx_cached_free_resources_lookup
  ON public.cached_free_resources (skill_name, career_path, expires_at);

ALTER TABLE public.cached_free_resources ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the shared cache
CREATE POLICY "Authenticated users can read free resource cache"
  ON public.cached_free_resources
  FOR SELECT
  TO authenticated
  USING (true);

-- No client-side writes; the edge function uses the service role
-- (no INSERT/UPDATE/DELETE policies = denied for end users)
