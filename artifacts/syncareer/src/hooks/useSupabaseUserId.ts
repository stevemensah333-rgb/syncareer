import { useAuth } from '@clerk/react';
import { useMemo } from 'react';
import { clerkIdToSupabaseId } from '@/integrations/supabase/client';

/**
 * Returns the deterministic UUID that maps the current Clerk user to the
 * UUID-typed `id` / `user_id` columns in Supabase. Use this anywhere that
 * pulls `userId` straight from Clerk and feeds it into a Supabase query.
 */
export function useSupabaseUserId(): string | null {
  const { userId } = useAuth();
  return useMemo(() => clerkIdToSupabaseId(userId), [userId]);
}
