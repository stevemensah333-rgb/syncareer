-- Fix: Add unique constraint on (major, region) so ON CONFLICT upsert works
ALTER TABLE public.market_intelligence_cache
  ADD CONSTRAINT market_intelligence_cache_major_region_unique UNIQUE (major, region);