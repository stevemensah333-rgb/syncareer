import { supabase } from '@/integrations/supabase/client';

// ─── Feature Keys ──────────────────────────────────────────────────────────
export type FeatureKey =
  | 'ai_coach_session'
  | 'mock_interview'
  | 'cv_export'
  | 'career_assessment'
  | 'job_application'
  | 'analytics_realtime'
  | 'ai_personalized_recommendation';

// ─── Quantified Free Tier Limits ─────────────────────────────────────────
export const FREE_LIMITS: Record<FeatureKey, { limit: number; period: 'monthly' | 'total' | 'active'; label: string }> = {
  
  ai_coach_session:               { limit: 5,  period: 'monthly', label: 'Assistant proposals' },
  mock_interview:                 { limit: 3,  period: 'monthly', label: 'Mock interviews' },
  cv_export:                      { limit: 2,  period: 'monthly', label: 'CV exports' },
  career_assessment:              { limit: 2,  period: 'total',   label: 'Career assessments' },
  job_application:                { limit: 10, period: 'active',  label: 'Active job applications' },
  analytics_realtime:             { limit: 0,  period: 'total',   label: 'Real-time analytics' },
  ai_personalized_recommendation: { limit: 0,  period: 'total',   label: 'Career recommendations for your profile' },
};

const PREMIUM_FEATURES: FeatureKey[] = [
  'analytics_realtime',
  'ai_personalized_recommendation',
];

export function isPremiumFeature(key: FeatureKey): boolean {
  return PREMIUM_FEATURES.includes(key);
}

export function hasAccess(featureKey: FeatureKey, isPremium: boolean): boolean {
  if (isPremium) return true;
  if (isPremiumFeature(featureKey)) return false;
  // For quantified features, basic access exists (limit checked separately)
  return true;
}

// ─── Server-side access check via edge function ───────────────────────────
export async function checkFeatureAccessServer(
  featureKey: string,
  increment = false
): Promise<{ allowed: boolean; used: number; limit: number; message?: string; is_premium: boolean }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { allowed: false, used: 0, limit: 0, message: 'Not authenticated', is_premium: false };

  const { data, error } = await supabase.functions.invoke('check-feature-access', {
    body: { feature_key: featureKey, increment },
  });

  if (error) {
    console.error('[checkFeatureAccessServer]', error);
    return { allowed: false, used: 0, limit: 0, message: 'Access check failed', is_premium: false };
  }

  return data;
}

// ─── Client-side usage helpers (for UI display only) ─────────────────────
export function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export async function getMonthlyUsage(userId: string, featureKey: string): Promise<number> {
  const month = getCurrentMonth();
  const { data } = await supabase
    .from('usage_logs')
    .select('usage_count')
    .eq('user_id', userId)
    .eq('feature_key', featureKey)
    .eq('month', month)
    .maybeSingle();
  return data?.usage_count ?? 0;
}

// ─── Human-readable labels ────────────────────────────────────────────────
export const FEATURE_LABELS: Record<string, string> = {
  
  ai_coach_session: 'Assistant Proposals',
  mock_interview: 'Mock Interviews',
  cv_export: 'CV Exports',
  career_assessment: 'Career Assessments',
  job_application: 'Active Job Applications',
  analytics_realtime: 'Real-Time Analytics',
  ai_personalized_recommendation: 'Career Recommendations',
};

export const FEATURE_UPGRADE_BENEFITS: Record<string, string[]> = {
  analytics_realtime: [
    'Live performance dashboard',
    'Skill gap trends',
    'Application funnel tracking',
  ],
  ai_personalized_recommendation: [
    'Career matches based on your profile',
    'Opportunity suggestions using your interests',
    'Skill gap analysis',
  ],
};
