import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Free tier limits ─────────────────────────────────────────────
const FREE_LIMITS: Record<string, { limit: number; period: 'monthly' | 'total' | 'active' }> = {
  portfolio_upload:               { limit: 3,  period: 'total' },
  ai_coach_session:               { limit: 5,  period: 'monthly' },
  mock_interview:                 { limit: 3,  period: 'monthly' },
  cv_export:                      { limit: 2,  period: 'monthly' },
  career_assessment:              { limit: 2,  period: 'total' },
  job_application:                { limit: 10, period: 'active' },
  analytics_realtime:             { limit: 0,  period: 'total' },
  ai_personalized_recommendation: { limit: 0,  period: 'total' },
};

const UPGRADE_MESSAGES: Record<string, string> = {
  portfolio_upload:               'Free plan allows 3 portfolio projects. Upgrade to Premium for unlimited uploads.',
  ai_coach_session:               'You have used all 5 AI Coach sessions for this month. Upgrade to Premium for unlimited sessions.',
  mock_interview:                 'You have used all 3 mock interview sessions for this month. Upgrade to Premium for unlimited interviews.',
  cv_export:                      'You have used both CV exports for this month. Upgrade to Premium for unlimited exports.',
  career_assessment:              'Free plan allows 2 career assessments. Upgrade to Premium for unlimited retakes.',
  job_application:                'Free plan tracks up to 10 active applications. Upgrade to Premium for unlimited tracking.',
  analytics_realtime:             'Real-time analytics is a Premium feature. Upgrade to access your live dashboard.',
  ai_personalized_recommendation: 'Personalized AI recommendations are a Premium feature. Upgrade to unlock.',
};

// ─── Helpers ──────────────────────────────────────────────────────

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

async function getMonthlyUsage(supabase: any, userId: string, featureKey: string): Promise<number> {
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

async function checkAccess(
  supabase: any,
  serviceSupabase: any,
  userId: string,
  featureKey: string,
  isPremium: boolean,
  increment: boolean
): Promise<{ allowed: boolean; used: number; limit: number; message?: string }> {

  // Premium users always pass
  if (isPremium) {
    if (increment && (featureKey === 'ai_coach_session' || featureKey === 'mock_interview' || featureKey === 'cv_export')) {
      await incrementUsage(serviceSupabase, userId, featureKey);
    }
    return { allowed: true, used: 0, limit: -1 };
  }

  const config = FREE_LIMITS[featureKey];
  if (!config) return { allowed: true, used: 0, limit: -1 };

  // Hard blocks (limit: 0)
  if (config.limit === 0) {
    return {
      allowed: false,
      used: 1,
      limit: 0,
      message: UPGRADE_MESSAGES[featureKey],
    };
  }

  let used = 0;

  if (config.period === 'monthly') {
    used = await getMonthlyUsage(supabase, userId, featureKey);
  } else if (config.period === 'total') {
    // Count directly from source tables
    if (featureKey === 'portfolio_upload') {
      const { count } = await supabase
        .from('portfolio_projects')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);
      used = count ?? 0;
    } else if (featureKey === 'career_assessment') {
      const { count } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null);
      used = count ?? 0;
    }
  } else if (config.period === 'active') {
    if (featureKey === 'job_application') {
      const { count } = await supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('applicant_id', userId)
        .in('status', ['applied', 'under_review', 'interview', 'shortlisted']);
      used = count ?? 0;
    }
  }

  const allowed = used < config.limit;

  if (allowed && increment) {
    await incrementUsage(serviceSupabase, userId, featureKey);
  }

  return {
    allowed,
    used,
    limit: config.limit,
    message: allowed ? undefined : UPGRADE_MESSAGES[featureKey],
  };
}

async function incrementUsage(serviceSupabase: any, userId: string, featureKey: string) {
  // Only increment monthly-tracked features
  const config = FREE_LIMITS[featureKey];
  if (!config || config.period !== 'monthly') return;

  const month = getCurrentMonth();
  const { data: existing } = await serviceSupabase
    .from('usage_logs')
    .select('id, usage_count')
    .eq('user_id', userId)
    .eq('feature_key', featureKey)
    .eq('month', month)
    .maybeSingle();

  if (existing) {
    await serviceSupabase
      .from('usage_logs')
      .update({ usage_count: existing.usage_count + 1, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await serviceSupabase
      .from('usage_logs')
      .insert({ user_id: userId, feature_key: featureKey, month, usage_count: 1 });
  }
}

// ─── Main handler ─────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User-scoped client (respects RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Service client (for writes like incrementing usage)
    const serviceSupabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const body = await req.json().catch(() => ({}));
    const featureKey: string = body.feature_key;
    const increment: boolean = body.increment ?? false;

    if (!featureKey) {
      return new Response(
        JSON.stringify({ error: 'feature_key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check subscription
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('tier, status, current_period_end')
      .eq('user_id', userId)
      .maybeSingle();

    let isPremium = false;
    if (subscription?.tier === 'premium' && subscription?.status === 'active') {
      if (subscription.current_period_end) {
        isPremium = new Date(subscription.current_period_end) > new Date();
      } else {
        isPremium = true;
      }
    }

    const result = await checkAccess(supabase, serviceSupabase, userId, featureKey, isPremium, increment);

    return new Response(
      JSON.stringify({
        allowed: result.allowed,
        used: result.used,
        limit: result.limit,
        is_premium: isPremium,
        message: result.message,
        feature_key: featureKey,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[check-feature-access] error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
