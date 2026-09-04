import React, { Suspense, lazy, useState, useCallback, useEffect, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { removeStructuredData, setMetaTags, setBreadcrumbSchema } from '@/lib/seo';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck, ArrowRight, ArrowLeft, RotateCcw, Calendar,
  Trophy, Brain, Clock, LogIn, Compass, User, Zap,
} from 'lucide-react';
import { useAssessment, type AssessmentResult } from '@/hooks/useAssessment';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useCareerRecommendations } from '@/hooks/useCareerRecommendations';
import { ASSESSMENT_QUESTIONS, RIASEC_LABELS, RIASEC_DESCRIPTIONS } from '@/data/assessmentQuestions';
import { personalityRadarData, skillsBarData } from '@/features/assessment/chartData';
import CareerRecommendations from '@/components/assessment/CareerRecommendations';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import AnimatedSection from '@/components/landing/AnimatedSection';
import {
  QUESTIONS_PER_PAGE,
  TOTAL_QUESTIONS,
  SECTION_INTROS,
  SECTION_START_PAGES,
  calculateScoresLocally,
} from './assessment/assessmentConstants';
import { assessmentResumeCapability, hasAssessmentAnalyticsConsent, setAssessmentAnalyticsConsent, trackAssessmentLifecycle } from '@/features/assessment/lifecycle';
import { validateAssessmentAnswers } from '@/features/assessment/scoring';
import { AssessmentQuestionCard } from '@/components/assessment/AssessmentQuestionCard';

// Result charts are only needed once a completed assessment is shown. Keeping
// recharts out of this route's static imports means answering questions (and
// the landing page's idle prefetch of this public route) no longer downloads
// the ~384 kB chart chunk.
const RiasecBarChart = lazy(() => import('@/components/assessment/AssessmentResultCharts').then((m) => ({ default: m.RiasecBarChart })));
const PersonalityRadarChart = lazy(() => import('@/components/assessment/AssessmentResultCharts').then((m) => ({ default: m.PersonalityRadarChart })));
const SkillsBarChart = lazy(() => import('@/components/assessment/AssessmentResultCharts').then((m) => ({ default: m.SkillsBarChart })));

const ChartFallback = () => <div className="h-full animate-pulse rounded-md bg-muted" />;

const Assessment = () => {
  const { profile, studentDetails } = useUserProfile();
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

  // Only use DB hooks for authenticated users
  const { latestResult, allResults, loading, submitting, canRetake, submitAssessment } = useAssessment();
  const activeResult = guestResult || latestResult;
  const { recommendations, clusterInsight, loading: careersLoading } = useCareerRecommendations(activeResult);
  const feedbackModal = useFeedbackModal('assessment');
  const [takingAssessment, setTakingAssessment] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [showIntro, setShowIntro] = useState<string | null>(null);
  const [guestSubmitting, setGuestSubmitting] = useState(false);
  const [analyticsConsent, setAnalyticsConsent] = useState(() => hasAssessmentAnalyticsConsent());
  const startedAtRef = useRef<number | null>(null);
  const takingRef = useRef(false);
  const answeredRef = useRef(0);
  const completedRef = useRef(false);

  const totalPages = Math.ceil(TOTAL_QUESTIONS / QUESTIONS_PER_PAGE);
  const currentQuestions = ASSESSMENT_QUESTIONS.slice(
    currentPage * QUESTIONS_PER_PAGE,
    (currentPage + 1) * QUESTIONS_PER_PAGE
  );

  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / TOTAL_QUESTIONS) * 100;
  const currentSection = currentQuestions[0]?.category;
  const sectionLabel = currentSection === 'personality' ? 'Personality' : currentSection === 'skills' ? 'Skills Preference' : 'Work Interest';

  const handleAnswer = useCallback((questionId: number, value: number) => {
    setAnswers(prev => {
      const next = { ...prev, [questionId]: value };
      const count = Object.keys(next).length;
      if (count !== Object.keys(prev).length) trackAssessmentLifecycle('progress', { answered: count, total: TOTAL_QUESTIONS });
      answeredRef.current = count;
      return next;
    });
  }, []);

  useEffect(() => {
    takingRef.current = takingAssessment;
    answeredRef.current = answeredCount;
  }, [takingAssessment, answeredCount]);

  useEffect(() => () => {
    if (takingRef.current && answeredRef.current > 0 && !completedRef.current) {
      trackAssessmentLifecycle('abandonment', { answered: answeredRef.current, total: TOTAL_QUESTIONS, elapsedSeconds: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined });
    }
  }, []);

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      const nextPage = currentPage + 1;
      const nextSectionKey = SECTION_START_PAGES[nextPage];
      if (nextSectionKey) setShowIntro(nextSectionKey);
      else setCurrentPage(nextPage);
    }
  };

  const handlePrev = () => {
    if (currentPage > 0) setCurrentPage(p => p - 1);
  };

  const handleIntroNext = () => {
    const startPage = Object.entries(SECTION_START_PAGES).find(([, k]) => k === showIntro)?.[0];
    if (startPage !== undefined) setCurrentPage(parseInt(startPage));
    setShowIntro(null);
  };

  const handleStartAssessment = () => {
    completedRef.current = false;
    startedAtRef.current = Date.now();
    trackAssessmentLifecycle('start', { answered: 0, total: TOTAL_QUESTIONS });
    setTakingAssessment(true);
    setShowIntro('personality');
  };

  const handleSubmit = async () => {
    if (isGuest) {
      // Guest: calculate results locally without requiring an account.
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
        completedRef.current = true;
        trackAssessmentLifecycle('completion', { answered: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS, elapsedSeconds: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined });
        setTakingAssessment(false);
        setAnswers({});
        setCurrentPage(0);
      } finally {
        setGuestSubmitting(false);
      }
    } else {
      const success = await submitAssessment(answers);
      if (success) {
        completedRef.current = true;
        trackAssessmentLifecycle('completion', { answered: TOTAL_QUESTIONS, total: TOTAL_QUESTIONS, elapsedSeconds: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined });
        setTakingAssessment(false);
        setAnswers({});
        setCurrentPage(0);
        feedbackModal.triggerFeedback();
      }
    }
  };

  const allCurrentAnswered = currentQuestions.every(q => answers[q.id] !== undefined);
  const isLastPage = currentPage === totalPages - 1;

  const daysUntilRetake = latestResult
    ? Math.max(0, 30 - differenceInDays(new Date(), new Date(latestResult.completed_at)))
    : 0;

  // Loading state
  if (isGuest === null || (!isGuest && loading)) {
    return (
      <PageLayout title="Assessment">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </PageLayout>
    );
  }

  // Redirect non-students who are authenticated
  if (!isGuest && profile && profile.user_type !== 'student') {
    return <Navigate to={getHomeRouteForRole(profile.user_type)} replace />;
  }

  // ── Section Intro Screen ──────────────────────────────────────────
  if (takingAssessment && showIntro) {
    const intro = SECTION_INTROS.find(s => s.key === showIntro)!;
    const Icon = intro.icon;
    const introIndex = SECTION_INTROS.indexOf(intro);
    return (
      <PageLayout title="Assessment">
        <div className="max-w-xl mx-auto">
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2 text-sm text-muted-foreground">
              <span>{answeredCount} of {TOTAL_QUESTIONS} answered</span>
              <span>Section {introIndex + 1} of 3</span>
            </div>
            <Progress value={progressPercent} className="h-1.5" aria-label={`Assessment progress: ${answeredCount} of ${TOTAL_QUESTIONS} questions answered`} />
          </div>
          <Card>
            <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${intro.bg}`}>
                <Icon className={`h-8 w-8 ${intro.color}`} />
              </div>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs mb-2">Questions {intro.questionRange}</Badge>
                <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">{intro.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{intro.description}</p>
              <Button size="lg" onClick={handleIntroNext} className="mt-2 rounded-full px-6">
                Begin Section <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // ── Taking Assessment ─────────────────────────────────────────────
  if (takingAssessment) {
    return (
      <PageLayout title="Assessment">
        <div className="max-w-2xl mx-auto space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary">{sectionLabel}</Badge>
                <span className="text-sm text-muted-foreground">
                  Question {currentPage * QUESTIONS_PER_PAGE + 1}–{Math.min((currentPage + 1) * QUESTIONS_PER_PAGE, TOTAL_QUESTIONS)} of {TOTAL_QUESTIONS}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" aria-label={`Assessment progress: ${answeredCount} of ${TOTAL_QUESTIONS} questions answered`} />
              <p className="text-xs text-muted-foreground mt-1">{answeredCount} of {TOTAL_QUESTIONS} answered</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {currentQuestions.map((question, index) => <AssessmentQuestionCard key={question.id} question={question} questionNumber={currentPage * QUESTIONS_PER_PAGE + index + 1} value={answers[question.id]} onChange={handleAnswer} />)}
          </div>

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentPage === 0} className="rounded-full px-5">
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            {isLastPage ? (
              <div className="flex flex-col items-end gap-1">
                <Button
                  onClick={handleSubmit}
                  disabled={answeredCount < TOTAL_QUESTIONS || submitting || guestSubmitting}
                  className="rounded-full px-6"
                >
                  {(submitting || guestSubmitting) ? 'Submitting...' : 'Submit Assessment'}
                  <ClipboardCheck className="h-4 w-4 ml-2" />
                </Button>
              </div>
            ) : (
              <Button onClick={handleNext} disabled={!allCurrentAnswered} className="rounded-full px-6">
                Next <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </PageLayout>
    );
  }

  // ── No Result Yet ─────────────────────────────────────────────────
  if (!activeResult) {
    return (
      <PageLayout title="Assessment">
        <div className="max-w-xl mx-auto">
          <AnimatedSection y={20}>
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Still choosing a direction?
              </h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Answer all 45 questions to explore interest themes, preferred work environments and broad role families. This does not measure your skills, readiness, employability or hiring chances.
              </p>
              {isGuest && (
                <p className="text-xs text-primary font-medium">No sign-up required. Guest results remain on this page only.</p>
              )}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {SECTION_INTROS.map(s => {
                  const Icon = s.icon;
                  return (
                    <div key={s.key} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center ${s.bg}`}>
                        <Icon className={`h-4 w-4 ${s.color}`} />
                      </div>
                      {s.title}
                    </div>
                  );
                })}
              </div>
              <div className="mx-auto flex max-w-md items-start gap-2 rounded-lg border p-3 text-left"><Checkbox id="assessment-analytics-consent" checked={analyticsConsent} onCheckedChange={(checked) => { const granted = checked === true; setAnalyticsConsent(granted); setAssessmentAnalyticsConsent(granted); }} /><div><Label htmlFor="assessment-analytics-consent" className="text-sm">Share anonymous assessment progress events</Label><p className="mt-1 text-xs text-muted-foreground">Optional. Sends start, answered-count, abandonment and completion timing only—never answers or result themes.</p></div></div>
              <p className="text-xs text-muted-foreground">{assessmentResumeCapability.explanation}</p>
              <Button size="lg" onClick={handleStartAssessment} className="rounded-full px-6">
                Start Assessment <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
          </AnimatedSection>
        </div>
      </PageLayout>
    );
  }

  // ── Results View ──────────────────────────────────────────────────
  const riasecChartData = Object.entries(activeResult.work_interest_score_json)
    .map(([key, value]) => ({
      name: RIASEC_LABELS[key] || key,
      score: value as number,
    }))
    .sort((a, b) => b.score - a.score);

  const personalityRadar = personalityRadarData(
    activeResult.personality_score_json as Record<string, number>,
  );

  const skillsChartData = skillsBarData(
    activeResult.skills_score_json as Record<string, number>,
  );

  return (
    <PageLayout title="Assessment">
      <div className="space-y-6">
        {/* Guest sign-up banner */}
        {isGuest && (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="pt-5 pb-5">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <LogIn className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium text-sm">Continue with a Syncareer account</p>
                    <p className="text-xs text-muted-foreground">Create a free account to keep future assessment results and continue into your career workspace.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/sign-up?returnTo=%2Fdashboard')} className="rounded-full px-5">
                  Create Account <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
        <AnimatedSection y={20}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {isGuest ? 'Completed just now' : `Last taken on ${format(new Date(activeResult.completed_at), 'MMMM d, yyyy')}`}
            </span>
          </div>
          {!isGuest && (
            <div className="flex items-center gap-3">
              {!canRetake() && daysUntilRetake > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{daysUntilRetake} day{daysUntilRetake !== 1 ? 's' : ''} until retake</span>
                </div>
              )}
              <Button variant="outline" onClick={handleStartAssessment} disabled={!canRetake()} className="rounded-full px-5">
                <RotateCcw className="h-4 w-4 mr-2" /> Retake Assessment
              </Button>
            </div>
          )}
        </div>
        </AnimatedSection>

        {/* Top 3 Interests */}
        <AnimatedSection delay={0.08} y={20}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your strongest interest themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[activeResult.primary_interest, activeResult.secondary_interest, activeResult.tertiary_interest].map((interest, i) => {
                if (!interest) return null;
                const key = Object.entries(RIASEC_LABELS).find(([, v]) => v === interest)?.[0] || '';
                return (
                  <div key={i} className="p-4 rounded-lg border bg-card">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={i === 0 ? 'default' : 'secondary'}>#{i + 1}</Badge>
                      <span className="font-semibold">{interest}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{RIASEC_DESCRIPTIONS[key] || ''}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* RIASEC Chart */}
        <AnimatedSection delay={0.12} y={20}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Work Interest — RIASEC Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="h-72"
              role="img"
              aria-label={`RIASEC work-interest scores. ${riasecChartData.map((item) => `${item.name}: ${item.score}%`).join('. ')}`}
            >
              <Suspense fallback={<ChartFallback />}>
                <RiasecBarChart data={riasecChartData} />
              </Suspense>
            </div>
          </CardContent>
        </Card>
        </AnimatedSection>

        {/* Personality + Skills */}
        <AnimatedSection delay={0.16} y={20}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" /> Personality Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64"
                role="img"
                aria-label={`Personality-profile scores: ${personalityRadar.map((item) => `${item.axis}: ${item.value}`).join('. ')}`}
              >
                <Suspense fallback={<ChartFallback />}>
                  <PersonalityRadarChart data={personalityRadar} />
                </Suspense>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">Scores aggregated from personality questions (1–15)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="h-4 w-4 text-accent" /> Skills Preference
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="h-64"
                role="img"
                aria-label={`Skills-preference scores: ${skillsChartData.map((item) => `${item.axis}: ${item.value}%`).join('. ')}`}
              >
                <Suspense fallback={<ChartFallback />}>
                  <SkillsBarChart data={skillsChartData} />
                </Suspense>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">Task-preference responses from questions 16–30; not verified skill level</p>
            </CardContent>
          </Card>
        </div>
        </AnimatedSection>

        {/* Career Recommendations */}
        <AnimatedSection delay={0.2} y={20}>
        <CareerRecommendations
          recommendations={recommendations}
          clusterInsight={clusterInsight}
          primaryInterest={activeResult.primary_interest}
          secondaryInterest={activeResult.secondary_interest}
          tertiaryInterest={activeResult.tertiary_interest}
          loading={careersLoading}
          isGuest={isGuest || false}
          userMajor={studentDetails?.major ?? null}
        />
        </AnimatedSection>

        {/* History (authenticated only) */}
        {!isGuest && allResults.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {allResults.map((r, i) => (
                  <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{format(new Date(r.completed_at), 'MMM d, yyyy')}</span>
                      {i === 0 && <Badge>Latest</Badge>}
                    </div>
                    <div className="flex gap-2">
                      {[r.primary_interest, r.secondary_interest, r.tertiary_interest].filter(Boolean).map((interest, j) => (
                        <Badge key={j} variant="outline" className="text-xs">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Guest bottom CTA */}
        {isGuest && (
          <Card className="border-primary/30 bg-accent text-center">
            <CardContent className="pt-8 pb-8 space-y-3">
              <h3 className="text-xl font-semibold tracking-tight md:text-2xl">
                Ready for the next step?
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Create a free account to keep future results, build your CV, practise interviews, and track applications.
              </p>
              <Button size="lg" onClick={() => navigate('/sign-up?returnTo=%2Fdashboard')} className="rounded-full px-6">
                Create Free Account <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </PageLayout>
  );
};

export default Assessment;
