import { Suspense, lazy, useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { removeStructuredData, setMetaTags, setBreadcrumbSchema } from '@/lib/seo';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  ArrowRight,
  RotateCcw,
  Calendar,
  Clock,
  LogIn,
  Compass,
  Brain,
  FileText,
  BarChart3,
} from 'lucide-react';
import { useAssessment, type AssessmentResult } from '@/hooks/useAssessment';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useCareerRecommendations } from '@/hooks/useCareerRecommendations';
import { useCareerProfileData } from '@/hooks/useCareerProfileData';
import { ASSESSMENT_QUESTIONS } from '@/data/assessmentQuestions';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AnimatedSection from '@/components/landing/AnimatedSection';
import { TOTAL_QUESTIONS, calculateScoresLocally } from './assessment/assessmentConstants';
import { hasAssessmentAnalyticsConsent, setAssessmentAnalyticsConsent, trackAssessmentLifecycle } from '@/features/assessment/lifecycle';
import { validateAssessmentAnswers } from '@/features/assessment/scoring';
import {
  topInterestThemes,
  derivedWorkPreferences,
  splitCareerDirections,
  marketSignalForDirection,
  relevantSkillsForDirections,
  explorationGapsForDirections,
  type MarketSignal,
} from '@/features/assessment/careerProfile';
import { AssessmentFlow } from '@/components/assessment/AssessmentFlow';
import { ResultReveal } from '@/components/assessment/ResultReveal';
import {
  ProfileSection,
  InterestThemesSection,
  WorkPreferencesSection,
  CareerDirectionsSection,
  WhyDirectionsNote,
} from '@/components/assessment/CareerProfileResult';
import { PersistentCareerProfile } from '@/components/assessment/PersistentCareerProfile';
import { AssessmentHistory } from '@/components/assessment/AssessmentHistory';
import { opportunitySearchForRoleFamily } from '@/features/assessment/roleFamilies';
import { personalityRadarData, skillsBarData } from '@/features/assessment/chartData';

// Result charts are only needed once a completed assessment is shown. Keeping
// recharts out of this route's static imports means answering questions (and
// the landing page's idle prefetch of this public route) does not download
// the ~384 kB chart chunk.
const PersonalityRadarChart = lazy(() =>
  import('@/components/assessment/AssessmentResultCharts').then((m) => ({
    default: m.PersonalityRadarChart,
  })),
);
const SkillsBarChart = lazy(() =>
  import('@/components/assessment/AssessmentResultCharts').then((m) => ({
    default: m.SkillsBarChart,
  })),
);

const ChartFallback = () => <div className="h-full animate-pulse rounded-md bg-muted" />;

const SECTION_NAMES: Record<string, string> = {
  personality: 'Work style',
  skills: 'Task preferences',
  work_interest: 'RIASEC interests',
};

const FLOW_SECTION_INTROS = [
  {
    key: 'personality',
    title: 'How you work',
    description:
      'Fifteen statements about how you think, work and relate to others. There are no right or wrong answers — respond based on how you genuinely behave.',
    questionRange: '1–15',
  },
  {
    key: 'skills',
    title: 'Tasks you enjoy',
    description:
      'Fifteen statements about the kinds of tasks and activities you enjoy doing. Rate each by what genuinely interests you — this is about preference, not proving ability.',
    questionRange: '16–30',
  },
  {
    key: 'work_interest',
    title: 'Your work interests',
    description:
      'The final fifteen statements map your interests to the six RIASEC themes — Realistic, Investigative, Artistic, Social, Enterprising and Conventional — the backbone of your Career Profile.',
    questionRange: '31–45',
  },
];

const Assessment = () => {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [isGuest, setIsGuest] = useState<boolean | null>(null); // null = loading
  const [guestResult, setGuestResult] = useState<AssessmentResult | null>(null);

  // Set SEO metadata
  useEffect(() => {
    setMetaTags({
      title: 'Free RIASEC Career Assessment | Syncareer',
      description: 'Explore RIASEC interest themes and broad work environments. This assessment does not measure skills, readiness or hiring probability.',
      keywords: 'career interests, RIASEC, work environments, career direction',
      ogTitle: 'Explore Your Work Interest Themes — Syncareer',
      ogDescription: 'Use a 45-question RIASEC assessment as one input while choosing a direction.',
      ogUrl: 'https://syncareer.me/assessment',
      ogImage: 'https://syncareer.me/og-image.png',
      ogImageWidth: 1200,
      ogImageHeight: 630,
      ogImageAlt: 'Syncareer — Turn a real opportunity into a stronger application.',
      canonical: 'https://syncareer.me/assessment',
      twitterCard: 'summary_large_image',
      twitterTitle: 'Explore Your Work Interest Themes — Syncareer',
      twitterDescription: 'Use a 45-question RIASEC assessment as one input while choosing a direction.',
      twitterImage: 'https://syncareer.me/og-image.png',
    });

    setBreadcrumbSchema([
      { name: 'Home', url: 'https://syncareer.me' },
      { name: 'Assessment', url: 'https://syncareer.me/assessment' },
    ]);

    return () => removeStructuredData('BreadcrumbList');
  }, []);

  // Check auth status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsGuest(!session);
    });
  }, []);

  // DB-backed state for authenticated users.
  const { latestResult, allResults, loading, submitting, canRetake, submitAssessment } = useAssessment();
  const activeResult = guestResult || latestResult;
  const { recommendations, clusterInsight, loading: careersLoading } = useCareerRecommendations(activeResult);

  // Persisted Career Profile data (skills, evidence, saved roles, postings).
  const {
    loading: profileDataLoading,
    recordedSkills,
    evidence,
    targetRoles,
    postings,
  } = useCareerProfileData(activeResult !== null);

  const feedbackModal = useFeedbackModal('assessment');
  const [takingAssessment, setTakingAssessment] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(() => hasAssessmentAnalyticsConsent());
  const startedAtRef = useRef<number | null>(null);
  const takingRef = useRef(false);
  const answeredRef = useRef(0);
  const completedRef = useRef(false);

  const answeredCount = Object.keys(answers).length;

  const handleAnswer = useCallback((questionId: number, value: number) => {
    setAnswers((prev) => {
      const next = { ...prev, [questionId]: value };
      const count = Object.keys(next).length;
      if (count !== Object.keys(prev).length) {
        trackAssessmentLifecycle('progress', { answered: count, total: TOTAL_QUESTIONS });
      }
      answeredRef.current = count;
      return next;
    });
  }, []);

  useEffect(() => {
    takingRef.current = takingAssessment;
    answeredRef.current = answeredCount;
  }, [takingAssessment, answeredCount]);

  useEffect(
    () => () => {
      if (takingRef.current && answeredRef.current > 0 && !completedRef.current) {
        trackAssessmentLifecycle('abandonment', {
          answered: answeredRef.current,
          total: TOTAL_QUESTIONS,
          elapsedSeconds: startedAtRef.current
            ? Math.round((Date.now() - startedAtRef.current) / 1000)
            : undefined,
        });
      }
    },
    [],
  );

  const handleStartAssessment = () => {
    completedRef.current = false;
    startedAtRef.current = Date.now();
    trackAssessmentLifecycle('start', { answered: 0, total: TOTAL_QUESTIONS });
    setAnswers({});
    setTakingAssessment(true);
  };

  const finishAndReveal = () => {
    completedRef.current = true;
    trackAssessmentLifecycle('completion', {
      answered: TOTAL_QUESTIONS,
      total: TOTAL_QUESTIONS,
      elapsedSeconds: startedAtRef.current
        ? Math.round((Date.now() - startedAtRef.current) / 1000)
        : undefined,
    });
    setTakingAssessment(false);
    setRevealing(true);
  };

  const handleComplete = async () => {
    if (isGuest) {
      setGuestSubmitting(true);
      try {
        if (!validateAssessmentAnswers(answers, ASSESSMENT_QUESTIONS)) {
          return;
        }
        const result = calculateScoresLocally(answers);
        setGuestResult({
          id: 'guest',
          created_at: new Date().toISOString(),
          ...result,
        });
        finishAndReveal();
        setAnswers({});
      } finally {
        setGuestSubmitting(false);
      }
    } else {
      const success = await submitAssessment(answers);
      if (success) {
        finishAndReveal();
        setAnswers({});
        feedbackModal.triggerFeedback();
      }
    }
  };

  const daysUntilRetake = latestResult
    ? Math.max(0, 30 - differenceInDays(new Date(), new Date(latestResult.completed_at)))
    : 0;

  const goSignUp = useCallback(() => {
    navigate('/sign-up?returnTo=%2Fassessment');
  }, [navigate]);

  // ── Derived Career Profile (pure, memoised) ───────────────────────────
  const profileModel = useMemo(() => {
    if (!activeResult) return null;

    const themes = topInterestThemes(activeResult);
    const preferences = derivedWorkPreferences(activeResult);
    const { strongest, alternatives } = splitCareerDirections(recommendations, themes);

    const marketSignals = new Map<string, MarketSignal>();
    for (const direction of [...strongest, ...alternatives]) {
      const signal = marketSignalForDirection(direction.recommendation.career.title, postings);
      if (signal) marketSignals.set(direction.recommendation.career.title, signal);
    }

    const relevantSkills = relevantSkillsForDirections(strongest, recordedSkills);
    const gaps = explorationGapsForDirections(strongest, recordedSkills);

    return { themes, preferences, strongest, alternatives, marketSignals, relevantSkills, gaps };
  }, [activeResult, recommendations, postings, recordedSkills]);

  // Loading state
  if (isGuest === null || (!isGuest && loading)) {
    return (
      <PageLayout title="Assessment">
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </PageLayout>
    );
  }

  // Redirect non-students who are authenticated
  if (!isGuest && profile && profile.user_type !== 'student') {
    return <Navigate to={getHomeRouteForRole(profile.user_type)} replace />;
  }

  // ── Taking the assessment (one question at a time) ─────────────────────
  if (takingAssessment) {
    return (
      <PageLayout title="Career Assessment">
        <AssessmentFlow
          questions={ASSESSMENT_QUESTIONS}
          sectionIntros={FLOW_SECTION_INTROS}
          sectionStartIndices={[0, 15, 30]}
          sectionName={(category) => SECTION_NAMES[category] ?? category}
          answers={answers}
          onAnswer={handleAnswer}
          onComplete={handleComplete}
          submitting={submitting || guestSubmitting}
        />
      </PageLayout>
    );
  }

  // ── Result transition ─────────────────────────────────────────────────
  if (revealing) {
    return (
      <PageLayout title="Career Assessment">
        <ResultReveal
          onDone={() => {
            setRevealing(false);
            window.scrollTo({ top: 0, behavior: 'auto' });
          }}
        />
      </PageLayout>
    );
  }

  // ── No result yet: landing / start ────────────────────────────────────
  if (!activeResult || !profileModel) {
    return (
      <PageLayout title="Career Assessment">
        <div className="mx-auto max-w-2xl">
          <AnimatedSection y={20}>
            <Card className="overflow-hidden">
              <CardContent className="space-y-6 pt-8 pb-8">
                <div className="space-y-2 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                    <Compass className="h-7 w-7 text-primary" />
                  </div>
                  <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                    What kinds of work fit you?
                  </h1>
                  <p className="mx-auto max-w-md text-sm text-muted-foreground">
                    45 quick statements about how you work, the tasks you enjoy and the activities
                    that draw you in. Your answers build a Career Profile of interest themes and
                    broad directions — one input while you choose what to pursue.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Compass, title: 'Interest themes', text: 'RIASEC patterns in the kinds of work that draw you in.' },
                    { icon: Brain, title: 'Career directions', text: 'Broad role families worth investigating from your interests.' },
                    { icon: BarChart3, title: 'Market signals', text: 'What current opportunities in those directions commonly emphasise.' },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.title} className="rounded-surface border border-border bg-secondary/20 p-4 text-left">
                        <Icon className="mb-2 h-4 w-4 text-primary" aria-hidden="true" />
                        <p className="text-sm font-semibold">{item.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.text}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-surface border border-border-subtle bg-secondary/20 p-4">
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    This assessment explores <strong className="font-medium text-foreground">interests</strong> — the kinds
                    of work you are drawn to. It does not measure skills, readiness, aptitude or hiring probability, and
                    interest alignment never proves a role is right for you. There are no right or wrong answers.
                  </p>
                </div>

                <div className="mx-auto flex max-w-md items-start gap-2 rounded-lg border p-3 text-left">
                  <Checkbox
                    id="assessment-analytics-consent"
                    checked={analyticsConsent}
                    onCheckedChange={(checked) => {
                      const granted = checked === true;
                      setAnalyticsConsent(granted);
                      setAssessmentAnalyticsConsent(granted);
                    }}
                  />
                  <div>
                    <Label htmlFor="assessment-analytics-consent" className="text-sm">
                      Share anonymous assessment progress events
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Optional. Sends start, answered-count, abandonment and completion timing only —
                      never answers or result themes.
                    </p>
                  </div>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  Answers are not saved as a draft. Leaving or refreshing before submission clears progress.
                </p>

                <div className="text-center">
                  {isGuest && (
                    <p className="mb-3 text-xs font-medium text-primary">
                      No sign-up required — guest results stay on this page.
                    </p>
                  )}
                  <Button size="lg" onClick={handleStartAssessment} className="rounded-full px-8">
                    Start exploring <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </PageLayout>
    );
  }

  // ── Career Profile result ─────────────────────────────────────────────
  const { themes, preferences, strongest, alternatives, marketSignals, relevantSkills, gaps } = profileModel;
  const personalityChart = personalityRadarData(
    activeResult.personality_score_json as Record<string, number>,
  );
  const skillsChart = skillsBarData(activeResult.skills_score_json as Record<string, number>);

  return (
    <PageLayout title="Your Career Profile">
      <div className="space-y-10">
        {/* Guest sign-up banner */}
        {isGuest && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <LogIn className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Keep this Career Profile</p>
                    <p className="text-xs text-muted-foreground">
                      Create a free account to save results over time and connect them with your skills, evidence and opportunities.
                    </p>
                  </div>
                </div>
                <Button size="sm" onClick={goSignUp} className="rounded-full px-5">
                  Create account <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <AnimatedSection y={20}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="type-label text-primary">Career Profile · Interest assessment</p>
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                What kinds of work fit you
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {isGuest
                  ? 'Completed just now'
                  : `Completed ${format(new Date(activeResult.completed_at), 'MMMM d, yyyy')}`}
              </p>
            </div>
            {!isGuest && (
              <div className="flex items-center gap-3">
                {!canRetake() && daysUntilRetake > 0 && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      {daysUntilRetake} day{daysUntilRetake !== 1 ? 's' : ''} until retake
                    </span>
                  </div>
                )}
                <Button variant="outline" onClick={handleStartAssessment} disabled={!canRetake()} className="rounded-full px-5">
                  <RotateCcw className="mr-2 h-4 w-4" /> Retake
                </Button>
              </div>
            )}
          </div>
        </AnimatedSection>

        {/* 1. Interest themes */}
        <AnimatedSection delay={0.06} y={12}>
          <ProfileSection
            eyebrow="Interest themes"
            title="Your RIASEC interest profile"
            description="The three themes your answers point to most strongly, alongside all six interest themes."
          >
            <InterestThemesSection
              themes={themes}
              allScores={activeResult.work_interest_score_json as Record<string, number>}
            />
          </ProfileSection>
        </AnimatedSection>

        {/* 2. What this suggests */}
        <AnimatedSection delay={0.08} y={12}>
          <ProfileSection
            eyebrow="What this suggests"
            title="Work preferences your answers describe"
            description="Patterns read directly from your responses about how you work and the tasks you enjoy. These are interests and preferences — not measured skill levels."
          >
            <WorkPreferencesSection preferences={preferences} />
          </ProfileSection>
        </AnimatedSection>

        {/* 3. Career directions */}
        <AnimatedSection delay={0.1} y={12}>
          <ProfileSection
            eyebrow="Career directions"
            title="Role families worth investigating"
            description="Ordered from how strongly each family's typical work overlaps with your interest themes. Closely scored families can swap order with a few different answers — treat these as starting points to explore, not verdicts. Strongest matches lead; alternatives stay one tap away."
          >
            {careersLoading ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Matching broad role families…
                </CardContent>
              </Card>
            ) : (
              <CareerDirectionsSection
                directions={[...strongest, ...alternatives]}
                marketSignals={marketSignals}
                onExplore={opportunitySearchForRoleFamily}
                isGuest={isGuest || false}
                onGuestCta={goSignUp}
              />
            )}
          </ProfileSection>
        </AnimatedSection>

        {/* 4. Why */}
        <AnimatedSection delay={0.12} y={12}>
          <WhyDirectionsNote themes={themes} clusterInsight={clusterInsight} />
        </AnimatedSection>

        {/* Personality + task-preference charts (supporting detail) */}
        <AnimatedSection delay={0.14} y={12}>
          <details className="group rounded-surface border border-border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold marker:content-none">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                Supporting detail: work-style & task-preference responses
              </span>
              <span className="type-label text-muted-foreground transition-transform duration-150 ease-standard group-open:rotate-180 motion-reduce:transition-none">
                ▾
              </span>
            </summary>
            <div className="grid gap-6 border-t border-border-subtle p-5 lg:grid-cols-2">
              <div>
                <p className="type-label mb-2 text-muted-foreground">How you describe working with others</p>
                <div
                  className="h-64"
                  role="img"
                  aria-label={`Work-style responses: ${personalityChart.map((item) => `${item.axis}: ${item.value}`).join('. ')}`}
                >
                  <Suspense fallback={<ChartFallback />}>
                    <PersonalityRadarChart data={personalityChart} />
                  </Suspense>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Self-reported work style from questions 1–15 — behaviour preferences, not ability.
                </p>
              </div>
              <div>
                <p className="type-label mb-2 text-muted-foreground">Tasks you enjoy</p>
                <div
                  className="h-64"
                  role="img"
                  aria-label={`Task-preference responses: ${skillsChart.map((item) => `${item.axis}: ${item.value}%`).join('. ')}`}
                >
                  <Suspense fallback={<ChartFallback />}>
                    <SkillsBarChart data={skillsChart} />
                  </Suspense>
                </div>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Enjoyment ratings from questions 16–30 — not verified skill levels.
                </p>
              </div>
            </div>
          </details>
        </AnimatedSection>

        {/* 5. Persistent Career Profile */}
        <AnimatedSection delay={0.16} y={12}>
          <ProfileSection
            eyebrow="Your Career Profile in Syncareer"
            title="Interests connected to what you've built"
            description="Your interest themes sit alongside the skills, evidence and saved roles already in your workspace. Only data you have actually created appears here."
          >
            <PersistentCareerProfile
              loading={profileDataLoading}
              isGuest={isGuest || false}
              onGuestCta={goSignUp}
              recordedSkills={recordedSkills}
              evidence={evidence}
              targetRoles={targetRoles}
              relevantSkills={relevantSkills}
              gaps={gaps}
            />
          </ProfileSection>
        </AnimatedSection>

        {/* 6. Longitudinal history (authenticated only) */}
        {!isGuest && allResults.length > 0 && (
          <AnimatedSection delay={0.18} y={12}>
            <AssessmentHistory results={allResults} />
          </AnimatedSection>
        )}

        {/* Next actions */}
        <AnimatedSection delay={0.2} y={12}>
          <section
            aria-labelledby="assessment-next-steps-title"
            className="space-y-4 rounded-surface border border-border/70 bg-card p-5 sm:p-6"
          >
            <div>
              <h2 id="assessment-next-steps-title" className="text-sm font-semibold text-foreground">
                What to do with this profile
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Interests narrow the field — your next steps build the evidence.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NextActionTile
                icon={<Compass className="h-4 w-4 text-primary" aria-hidden="true" />}
                title="Explore real opportunities"
                text={`Search current roles connected to your ${themes[0]?.label ?? 'top'} interests.`}
                href={isGuest ? undefined : `/opportunities?q=${encodeURIComponent(activeResult.primary_interest || '')}`}
                isGuest={isGuest || false}
                onGuestCta={goSignUp}
              />
              <NextActionTile
                icon={<FileText className="h-4 w-4 text-primary" aria-hidden="true" />}
                title="Build evidence for a direction"
                text="Choose a direction that interests you and add projects or experience to your dossier."
                href={isGuest ? undefined : '/cv-builder'}
                isGuest={isGuest || false}
                onGuestCta={goSignUp}
              />
              <NextActionTile
                icon={<BarChart3 className="h-4 w-4 text-primary" aria-hidden="true" />}
                title="Compare market signals"
                text="See demand, commonly emphasised skills and salary context for your field."
                href={isGuest ? undefined : '/analysis'}
                isGuest={isGuest || false}
                onGuestCta={goSignUp}
              />
            </div>
          </section>
        </AnimatedSection>
      </div>

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </PageLayout>
  );
};

function NextActionTile({
  icon,
  title,
  text,
  href,
  isGuest,
  onGuestCta,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  isGuest: boolean;
  onGuestCta: () => void;
}) {
  return (
    <div className="flex flex-col justify-between gap-3 rounded-surface border border-border bg-secondary/20 p-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">{icon}<h3 className="text-xs font-semibold text-foreground">{title}</h3></div>
        <p className="text-[11px] leading-relaxed text-muted-foreground">{text}</p>
      </div>
      {isGuest ? (
        <Button size="sm" variant="outline" onClick={onGuestCta} className="w-full justify-between text-xs">
          Create account to continue <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button size="sm" variant="outline" asChild className="w-full justify-between text-xs">
          <Link to={href!}>
            Continue <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
      )}
    </div>
  );
};

export default Assessment;
