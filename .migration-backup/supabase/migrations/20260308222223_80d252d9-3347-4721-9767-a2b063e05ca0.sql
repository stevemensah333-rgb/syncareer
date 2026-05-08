
CREATE TABLE public.market_intelligence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  major text NOT NULL,
  region text NOT NULL DEFAULT 'global',
  hard_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  soft_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  salary_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  demand_forecast jsonb NOT NULL DEFAULT '[]'::jsonb,
  career_outlook jsonb NOT NULL DEFAULT '[]'::jsonb,
  market_insights jsonb NOT NULL DEFAULT '[]'::jsonb,
  region_summary text,
  data_confidence text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX market_intelligence_major_region_idx
  ON public.market_intelligence_cache (lower(major), lower(region));

ALTER TABLE public.market_intelligence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market intelligence"
  ON public.market_intelligence_cache
  FOR SELECT
  TO authenticated
  USING (true);
