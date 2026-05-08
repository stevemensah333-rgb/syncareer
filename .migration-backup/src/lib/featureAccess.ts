import { supabase } from '@/integrations/supabase/client';

// ─── Feature Keys ──────────────────────────────────────────────────────────
export type FeatureKey =
  | 'portfolio_upload'
  | 'ai_coach_session'
  | 'mock_interview'
  | 'cv_export'
  | 'career_assessment'
  | 'job_application'
  | 'analytics_realtime'
  | 'ai_personalized_recommendation'
  // Legacy aliases kept for compatibility
  | 'ai_coach_basic'
  | 'ai_coach_unlimited'
  | 'interview_basic'
  | 'interview_advanced'
  | 'cv_basic'
  | 'cv_advanced'
  | 'analytics_monthly'
  | 'portfolio_basic'
  | 'portfolio_advanced';

// ─── Quantified Free Tier Limits ─────────────────────────────────────────
export const FREE_LIMITS: Record<string, { limit: number; period: 'monthly' | 'total' | 'active'; label: string }> = {
  portfolio_upload:               { limit: 3,  period: 'total',   label: 'Portfolio projects' },
  ai_coach_session:               { limit: 5,  period: 'monthly', label: 'AI Coach sessions' },
  mock_interview:                 { limit: 3,  period: 'monthly', label: 'Mock interviews' },
  cv_export:                      { limit: 2,  period: 'monthly', label: 'CV exports' },
  career_assessment:              { limit: 2,  period: 'total',   label: 'Career assessments' },
  job_application:                { limit: 10, period: 'active',  label: 'Active job applications' },
  analytics_realtime:             { limit: 0,  period: 'total',   label: 'Real-time analytics' },
  ai_personalized_recommendation: { limit: 0,  period: 'total',   label: 'Personalized AI recommendations' },
};

// ─── Legacy compat ────────────────────────────────────────────────────────
export const FREE_AI_COACH_MONTHLY_LIMIT = 5;

const PREMIUM_FEATURES: FeatureKey[] = [
  'analytics_realtime',
  'ai_personalized_recommendation',
];

export function isPremiumFeature(key: FeatureKey): boolean {
  // Hard premium-only features
  if (PREMIUM_FEATURES.includes(key)) return true;
  // Legacy
  const legacyPremium: FeatureKey[] = ['ai_coach_unlimited', 'interview_advanced', 'cv_advanced', 'portfolio_advanced'];
  return legacyPremium.includes(key);
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

// Legacy helpers kept for compatibility
export async function getAICoachUsageThisMonth(userId: string): Promise<number> {
  return getMonthlyUsage(userId, 'ai_coach_session');
}

export async function incrementAICoachUsage(userId: string): Promise<number> {
  // Delegate to server-side edge function to avoid double-counting
  await checkFeatureAccessServer('ai_coach_session', true);
  return getAICoachUsageThisMonth(userId);
}

export async function canUseAICoach(
  userId: string,
  isPremium: boolean
): Promise<{ allowed: boolean; used: number; limit: number }> {
  if (isPremium) return { allowed: true, used: 0, limit: Infinity };
  const used = await getAICoachUsageThisMonth(userId);
  return {
    allowed: used < FREE_AI_COACH_MONTHLY_LIMIT,
    used,
    limit: FREE_AI_COACH_MONTHLY_LIMIT,
  };
}

// ─── Human-readable labels ────────────────────────────────────────────────
export const FEATURE_LABELS: Record<string, string> = {
  portfolio_upload: 'Portfolio Projects',
  ai_coach_session: 'AI Coach Sessions',
  mock_interview: 'Mock Interviews',
  cv_export: 'CV Exports',
  career_assessment: 'Career Assessments',
  job_application: 'Active Job Applications',
  analytics_realtime: 'Real-Time Analytics',
  ai_personalized_recommendation: 'Personalized AI Recommendations',
  // legacy
  ai_coach_basic: 'AI Coach (Basic)',
  ai_coach_unlimited: 'AI Coach (Unlimited)',
  interview_basic: 'Interview Simulator (Basic)',
  interview_advanced: 'Interview Simulator (Advanced)',
  cv_basic: 'CV Builder (Essential)',
  cv_advanced: 'CV Builder (All Features)',
  analytics_monthly: 'Monthly Analytics',
  portfolio_basic: 'Portfolio (Basic)',
  portfolio_advanced: 'Portfolio Analytics',
};

export const FEATURE_UPGRADE_BENEFITS: Record<string, string[]> = {
  analytics_realtime: [
    'Live performance dashboard',
    'Skill gap trends',
    'Application funnel tracking',
  ],
  ai_personalized_recommendation: [
    'AI-ranked career matches based on your profile',
    'RIASEC-aligned opportunity discovery',
    'Personalized skill gap analysis',
  ],
  ai_coach_unlimited: [
    'Unlimited AI coaching sessions per month',
    'Priority response quality',
    'Personalized career roadmaps',
  ],
  interview_advanced: [
    'Voice interview mode',
    'Industry-specific question banks',
    'Detailed scoring and feedback',
  ],
  cv_advanced: [
    'AI-powered CV optimization',
    'ATS score analysis',
    'Multiple template formats',
  ],
  portfolio_advanced: [
    'Advanced portfolio analytics',
    'Engagement and view tracking',
    'AI-generated portfolio summary',
  ],
  // no-upgrade features
  ai_coach_basic: [],
  interview_basic: [],
  cv_basic: [],
  analytics_monthly: [],
  portfolio_basic: [],
};
