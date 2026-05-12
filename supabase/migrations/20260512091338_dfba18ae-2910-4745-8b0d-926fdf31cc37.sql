CREATE TABLE public.alumni_outcomes_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  university_name text NOT NULL,
  major text NOT NULL,
  region text NOT NULL DEFAULT 'accra_ghana',
  top_employers jsonb NOT NULL DEFAULT '[]'::jsonb,
  common_roles jsonb NOT NULL DEFAULT '[]'::jsonb,
  salary_observations text,
  paths_summary text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX alumni_outcomes_unique_idx
  ON public.alumni_outcomes_cache (lower(university_name), lower(major), lower(region));

ALTER TABLE public.alumni_outcomes_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read alumni outcomes"
  ON public.alumni_outcomes_cache FOR SELECT
  TO authenticated
  USING (true);

CREATE TRIGGER update_alumni_outcomes_updated_at
  BEFORE UPDATE ON public.alumni_outcomes_cache
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();