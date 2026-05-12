import { useState, useEffect, useCallback, useRef, useId } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { SubscriptionData } from '@/services/subscriptionService';
import { getUserSubscription, isPremiumUser } from '@/services/subscriptionService';
import {
  hasAccess,
  getMonthlyUsage,
  FREE_LIMITS,
  type FeatureKey,
} from '@/lib/featureAccess';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const instanceId = useId();

  const fetchSubscription = useCallback(async () => {
    try {
      setError(null);
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setSubscription(null);
        setIsPremium(false);
        setLoading(false);
        return;
      }

      const sub = await getUserSubscription(user.id);
      const premium = await isPremiumUser(user.id);

      setSubscription(sub);
      setIsPremium(premium);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load subscription';
      console.error('[useSubscription] Fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubscription();

    const channel = supabase
      .channel(`subscriptions-realtime-${instanceId}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'subscriptions' },
        () => fetchSubscription()
      );
    channelRef.current = channel;
    channel.subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [fetchSubscription, instanceId]);

  return { subscription, isPremium, loading, error, refetch: fetchSubscription };
}

export function usePremiumFeature() {
  const { isPremium, loading } = useSubscription();
  return { canAccess: isPremium, loading };
}

// ─── Per-Feature Access Hook ────────────────────────────────────────────
export function useFeatureAccess(featureKey: FeatureKey) {
  const { isPremium, loading } = useSubscription();
  const allowed = loading ? false : hasAccess(featureKey, isPremium);
  return { allowed, loading, isPremium };
}

// ─── AI Coach Usage Hook ────────────────────────────────────────────────
export function useAICoachAccess() {
  const { isPremium, loading: subLoading } = useSubscription();
  const [usageData, setUsageData] = useState<{ used: number; limit: number; allowed: boolean } | null>(null);
  const [usageLoading, setUsageLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUsageLoading(false); return; }
    if (isPremium) {
      setUsageData({ used: 0, limit: Infinity, allowed: true });
      setUsageLoading(false);
      return;
    }
    const limit = FREE_LIMITS.ai_coach_session.limit;
    const used = await getMonthlyUsage(user.id, 'ai_coach_session');
    setUsageData({ used, limit, allowed: used < limit });
    setUsageLoading(false);
  }, [isPremium]);

  useEffect(() => {
    if (!subLoading) fetchUsage();
  }, [subLoading, fetchUsage]);

  return {
    ...usageData,
    loading: subLoading || usageLoading,
    isPremium,
    refetchUsage: fetchUsage,
  };
}
