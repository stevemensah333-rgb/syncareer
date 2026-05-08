import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionData {
  id: string;
  user_id: string;
  tier: 'free' | 'premium';
  status: 'active' | 'canceled' | 'expired';
  payment_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export async function getUserSubscription(userId: string): Promise<SubscriptionData | null> {
  try {
    const { data, error } = await (supabase as any)
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data || null;
  } catch (error) {
    console.error('[Subscription Service] Error fetching subscription:', error);
    return null;
  }
}

export async function isPremiumUser(userId: string): Promise<boolean> {
  const subscription = await getUserSubscription(userId);
  if (!subscription) return false;

  if (subscription.status !== 'active') return false;

  if (subscription.current_period_end) {
    const endDate = new Date(subscription.current_period_end);
    if (endDate < new Date()) return false;
  }

  return subscription.tier === 'premium';
}
