import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

type UserAction = 'applied' | 'viewed' | 'dismissed' | 'explored' | 'none';
type Outcome = 'pending' | 'success' | 'rejected' | 'withdrawn' | 'no_response';

interface TrackRecommendationParams {
  recommendationId?: string;
  itemTitle: string;
  itemId?: string;
  type?: 'career' | 'job' | 'skill' | 'course';
  category?: 'safe' | 'growth';
  confidence?: number;
  action: UserAction;
}

interface UpdateOutcomeParams {
  itemTitle: string;
  outcome: Outcome;
  details?: Record<string, string | number | boolean | null>;
}

/**
 * Hook for tracking recommendation outcomes in the career intelligence feedback loop.
 * Logs user actions (applied, viewed, dismissed) and outcomes (success, rejected)
 * against recommendations to reinforce the AI guidance engine.
 */
export function useOutcomeTracking() {
  const trackAction = useCallback(async (params: TrackRecommendationParams) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: existing } = await supabase
        .from('recommendation_outcomes')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('recommended_item_title', params.itemTitle)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Update the most recent recommendation for this item
        await supabase
          .from('recommendation_outcomes')
          .update({
            user_action: params.action,
            acted_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      } else {
        // Create new outcome record
        await supabase
          .from('recommendation_outcomes')
          .insert({
            user_id: session.user.id,
            recommendation_type: params.type || 'career',
            recommended_item_id: params.itemId || null,
            recommended_item_title: params.itemTitle,
            confidence_score: params.confidence || 0,
            recommendation_category: params.category || 'safe',
            user_action: params.action,
            acted_at: new Date().toISOString(),
            outcome: 'pending',
          });
      }
    } catch (error) {
      // Silent fail — outcome tracking should never block user flow
      console.error('Outcome tracking error:', error);
    }
  }, []);

  const updateOutcome = useCallback(async (params: UpdateOutcomeParams) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data: existing } = await supabase
        .from('recommendation_outcomes')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('recommended_item_title', params.itemTitle)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('recommendation_outcomes')
          .update({
            outcome: params.outcome,
            outcome_details: params.details || {},
            outcome_at: new Date().toISOString(),
          })
          .eq('id', existing.id);
      }
    } catch (error) {
      console.error('Outcome update error:', error);
    }
  }, []);

  /** Fire after key events to recompute intelligence profile */
  const triggerIntelligenceRefresh = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      await supabase.functions.invoke('compute-user-intelligence', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (error) {
      console.error('Intelligence refresh error:', error);
    }
  }, []);

  return { trackAction, updateOutcome, triggerIntelligenceRefresh };
}
