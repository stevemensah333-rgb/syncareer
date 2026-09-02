import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { loadCurrentDossier } from './currentDossier';

export const currentDossierKeys = {
  all: ['current-dossier'] as const,
  user: (userId: string) => ['current-dossier', userId] as const,
};

export function useCurrentDossier(enabled: boolean) {
  const userId = useSupabaseUserId();
  const query = useQuery({
    queryKey: userId ? currentDossierKeys.user(userId) : currentDossierKeys.all,
    queryFn: () => loadCurrentDossier(supabase, userId as string),
    enabled: enabled && Boolean(userId),
    staleTime: 60_000,
  });

  useEffect(() => {
    if (query.error) console.warn('[navigation] Current dossier shortcut is unavailable');
  }, [query.error]);

  return query.data ?? null;
}
