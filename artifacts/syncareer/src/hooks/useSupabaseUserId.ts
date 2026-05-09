import { useAuth } from '@/lib/auth';

/**
 * Returns the signed-in Supabase user's UUID, or null when signed out.
 * Kept as a thin wrapper so existing call sites don't have to change.
 */
export function useSupabaseUserId(): string | null {
  const { userId } = useAuth();
  return userId;
}
