import { useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface YouTubeResource {
  videoId: string;
  title: string;
  channel: string;
  durationLabel: string;
  viewCount: number;
  thumbnailUrl: string;
  url: string;
}

export interface CuratedResource {
  title: string;
  provider: string;
  url: string;
  description: string;
}

export interface FreeResourcePayload {
  youtube: YouTubeResource[];
  curated: CuratedResource[];
}

interface CacheEntry {
  loading: boolean;
  data: FreeResourcePayload | null;
  error: string | null;
}

/**
 * Lazy fetcher for free learning resources (YouTube + curated free platforms).
 * Caches per-skill in memory so opening/closing a skill card doesn't refetch.
 */
export function useFreeResources(careerPath: string | null) {
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});

  const fetchFor = useCallback(
    async (skillName: string) => {
      if (!careerPath || !skillName) return;
      const key = skillName.toLowerCase();
      if (cache[key]?.data || cache[key]?.loading) return;

      setCache(prev => ({ ...prev, [key]: { loading: true, data: null, error: null } }));

      try {
        const { data, error } = await supabase.functions.invoke('suggest-free-resources', {
          body: { skillName, careerPath },
        });
        if (error) throw error;
        setCache(prev => ({
          ...prev,
          [key]: {
            loading: false,
            data: { youtube: data?.youtube || [], curated: data?.curated || [] },
            error: null,
          },
        }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load free resources';
        setCache(prev => ({ ...prev, [key]: { loading: false, data: null, error: msg } }));
      }
    },
    [careerPath, cache],
  );

  const getEntry = useCallback(
    (skillName: string): CacheEntry => {
      const key = skillName.toLowerCase();
      return cache[key] || { loading: false, data: null, error: null };
    },
    [cache],
  );

  return { fetchFor, getEntry };
}
