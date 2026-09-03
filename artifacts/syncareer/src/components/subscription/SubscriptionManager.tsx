import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from 'sonner';
import {
  ArrowUpRight,
  CheckCircle,
  CheckCircle2,
  Calendar,
  Lock,
  AlertCircle,
  TrendingUp,
  BarChart2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FREE_LIMITS, getCurrentMonth } from '@/lib/featureAccess';
import PaystackButton from '@/components/payment/PaystackButton';

const MONTHLY_FEATURES = ['ai_coach_session', 'mock_interview', 'cv_export'] as const;

interface UsageData {
  ai_coach_session: number;
  mock_interview: number;
  cv_export: number;
  career_assessment: number;
  job_application: number;
}

const PREMIUM_PLAN_FEATURES = [
  'Assistant proposals: Unlimited',
  'Mock interviews: Unlimited + advanced roles',
  'CV downloads: Unlimited (multiple formats)',
  'Career assessments: Unlimited retakes',
  'Job applications tracked: Unlimited',
  'Analytics: Real-time dashboard',
  'Personalized AI career recommendations',
  'Priority support & early feature access',
];

export default function SubscriptionManager() {
  const { subscription, isPremium, loading, refetch } = useSubscription();
  const navigate = useNavigate();
  const [usage, setUsage] = useState<UsageData>({
    ai_coach_session: 0,
    mock_interview: 0,
    cv_export: 0,
    career_assessment: 0,
    job_application: 0,
  });
  const [usageLoading, setUsageLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUsageLoading(false); return; }
    const userId = session.user.id;
    const month = getCurrentMonth();

    const [
      monthlyResult,
      assessmentResult,
      jobAppsResult,
    ] = await Promise.all([
      supabase
        .from('usage_logs')
        .select('feature_key, usage_count')
        .eq('user_id', userId)
        .eq('month', month)
        .in('feature_key', [...MONTHLY_FEATURES]),
      supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .not('completed_at', 'is', null),
      supabase
        .from('job_applications')
        .select('*', { count: 'exact', head: true })
        .eq('applicant_id', userId)
        .in('status', ['applied', 'under_review', 'interview', 'shortlisted']),
    ]);

    const monthlyMap: Record<string, number> = {};
    (monthlyResult.data || []).forEach((row) => {
      monthlyMap[row.feature_key] = row.usage_count;
    });

    setUsage({
      ai_coach_session: monthlyMap['ai_coach_session'] ?? 0,
      mock_interview: monthlyMap['mock_interview'] ?? 0,
      cv_export: monthlyMap['cv_export'] ?? 0,
      career_assessment: assessmentResult.count ?? 0,
      job_application: jobAppsResult.count ?? 0,
    });
    setUsageLoading(false);
  }, []);

  useEffect(() => {
    if (!loading) fetchUsage();
  }, [loading, fetchUsage]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const isExpiringSoon = () => {
    if (!subscription?.current_period_end) return false;
    const end = new Date(subscription.current_period_end);
    const daysLeft = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 7 && daysLeft > 0;
  };

  const daysLeft = () => {
    if (!subscription?.current_period_end) return null;
    return Math.ceil((new Date(subscription.current_period_end).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  };

  const usageRows: { key: keyof UsageData; label: string; limit: number; period: string }[] = [
    { key: 'ai_coach_session',  label: 'Assistant proposals',      limit: FREE_LIMITS.ai_coach_session.limit,  period: '/mo' },
    { key: 'mock_interview',    label: 'Mock Interviews',         limit: FREE_LIMITS.mock_interview.limit,    period: '/mo' },
    { key: 'cv_export',         label: 'CV Exports',              limit: FREE_LIMITS.cv_export.limit,         period: '/mo' },
    { key: 'career_assessment', label: 'Career Assessments',      limit: FREE_LIMITS.career_assessment.limit, period: ' total' },
    { key: 'job_application',   label: 'Active Job Applications', limit: FREE_LIMITS.job_application.limit,   period: ' active' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold">Current Plan</h3>
          {isPremium ? (
            <Badge className="flex items-center gap-1 bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3" />
              Premium
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground">Free — Starter</Badge>
          )}
        </div>

        {isPremium ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Premium Plan Active</p>
                <p className="text-sm text-muted-foreground">Full access to all features — no limits</p>
              </div>
            </div>
            {subscription && (
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className="font-medium capitalize">{subscription.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Renewal Date</p>
                  <p className="font-medium flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {formatDate(subscription.current_period_end)}
                  </p>
                </div>
              </div>
            )}
            {isExpiringSoon() && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                Your plan expires in {daysLeft()} day{daysLeft() !== 1 ? 's' : ''}. Renew to keep full access.
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              5 assistant proposals/month · 3 mock interviews/month · 10 job applications tracked
            </p>
           <PaystackButton
              plan="monthly"
              onSuccess={() => { refetch(); toast.success('Premium activated!'); }}
              className="w-full"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Upgrade to Premium — GH₵30/month
            </PaystackButton>
          </div>
        )}
      </Card>

      {/* Usage Breakdown — free users only */}
      {!isPremium && (
        <Card className="p-6">
          <h4 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-primary" />
            Usage This Period
          </h4>
          {usageLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-10 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {usageRows.map(({ key, label, limit, period }) => {
                const used = usage[key];
                const pct = Math.min(100, (used / limit) * 100);
                const atLimit = used >= limit;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className={atLimit ? 'text-destructive font-medium' : 'text-foreground'}>{label}</span>
                      <span className={`font-medium tabular-nums ${atLimit ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {used} / {limit}{period}
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-1.5 ${atLimit ? '[&>div]:bg-destructive' : pct >= 80 ? '[&>div]:bg-amber-500' : ''}`}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* Feature comparison */}
      <Card className="p-6">
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          {isPremium ? 'Your Plan Includes' : 'What You Get with Premium'}
        </h4>
        <ul className="space-y-2.5">
          {(isPremium ? PREMIUM_PLAN_FEATURES : PREMIUM_PLAN_FEATURES).map((feature) => (
            <li key={feature} className="flex items-center gap-2.5 text-sm">
              {isPremium
                ? <CheckCircle className="w-4 h-4 text-success flex-shrink-0" />
                : <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              }
              <span className={isPremium ? 'text-foreground' : 'text-muted-foreground'}>{feature}</span>
            </li>
          ))}
        </ul>
        {!isPremium && (
          <Button
            onClick={() => navigate('/pricing')}
            className="w-full mt-4"
            variant="outline"
          >
            View Full Pricing Details
          </Button>
        )}
      </Card>
    </div>
  );
}
