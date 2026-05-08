import React, { useState, useCallback, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useOfflineDraft } from '@/hooks/useOfflineDraft';
import { Navigate, useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { getHomeRouteForRole } from '@/components/auth/RoleRoute';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import {
  ClipboardCheck, ArrowRight, ArrowLeft, RotateCcw, Calendar,
  Trophy, Brain, User, Zap, Compass, Clock, LogIn,
} from 'lucide-react';
import { useAssessment, type AssessmentResult } from '@/hooks/useAssessment';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useCareerRecommendations } from '@/hooks/useCareerRecommendations';
import { ASSESSMENT_QUESTIONS, LIKERT_OPTIONS, RIASEC_LABELS, RIASEC_DESCRIPTIONS } from '@/data/assessmentQuestions';
import CareerRecommendations from '@/components/assessment/CareerRecommendations';
import { format, differenceInDays } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

const QUESTIONS_PER_PAGE = 5;
const TOTAL_QUESTIONS = 45;

const SECTION_COLORS: Record<string, string> = {
  Realistic: 'hsl(var(--primary))',
  Investigative: 'hsl(var(--accent))',
  Artistic: 'hsl(var(--secondary))',
  Social: 'hsl(168, 81%, 44%)',
  Enterprising: 'hsl(38, 92%, 50%)',
  Conventional: 'hsl(220, 14%, 46%)',
};

const SECTION_INTROS = [
  {
    key: 'personality',
    title: 'Personality Traits',
    description: 'These 15 questions explore how you think, work, and relate to others. There are no right or wrong answers — respond based on how you genuinely behave.',
    icon: User,
    color: 'text-primary',
    bg: 'bg-primary/10',
    questionRange: '1–15',
  },
  {
    key: 'skills',
    title: 'Skills Preference',
    description: 'These 15 questions identify the types of tasks and activities you enjoy and feel confident doing. Rate each statement based on your actual experience.',
    icon: Zap,
    color: 'text-accent',
    bg: 'bg-accent/10',
    questionRange: '16–30',
  },
  {
    key: 'work_interest',
    title: 'Work Interest (RIASEC)',
    description: 'These 15 questions map your interests to the 6 RIASEC career categories — Realistic, Investigative, Artistic, Social, Enterprising, and Conventional.',
    icon: Compass,
    color: 'text-secondary-foreground',
    bg: 'bg-secondary/30',
    questionRange: '31–45',
  },
];

const SECTION_START_PAGES: Record<number, string> = {
  0: 'personality',
  3: 'skills',
  6: 'work_interest',
};

/** Calculate assessment scores locally (for guest users or reuse) */
function calculateScoresLocally(answers: Record<number, number>): Omit<AssessmentResult, 'id' | 'created_at'> {
  const personalityScores: Record<string, number> = {};
  const skillsScores: Record<string, number> = {};
  const riasecScores: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  const riasecCounts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };

  ASSESSMENT_QUESTIONS.forEach(q => {
    const val = answers[q.id];
    if (q.category === 'personality') {
      personalityScores[`q${q.id}`] = val;
    } else if (q.category === 'skills') {
      skillsScores[`q${q.id}`] = val;
    } else if (q.category === 'work_interest' && q.subcategory) {
      riasecScores[q.subcategory] += val;
      riasecCounts[q.subcategory] += 1;
    }
  });

  const workInterestScores: Record<string, number> = {};
  Object.keys(riasecScores).forEach(key => {
    const maxPossible = riasecCounts[key] * 5;
    workInterestScores[key] = maxPossible > 0 ? Math.round((riasecScores[key] / maxPossible) * 100) : 0;
  });

  const sorted = Object.entries(workInterestScores).sort(([, a], [, b]) => b - a);
  const primary = sorted[0]?.[0] || null;
  const secondary = sorted[1]?.[0] || null;
  const tertiary = sorted[2]?.[0] || null;

  return {
    completed_at: new Date().toISOString(),
    personality_score_json: personalityScores,
    skills_score_json: skillsScores,
    work_interest_score_json: workInterestScores,
    primary_interest: primary ? RIASEC_LABELS[primary] : null,
    secondary_interest: secondary ? RIASEC_LABELS[secondary] : null,
    tertiary_interest: tertiary ? RIASEC_LABELS[tertiary] : null,
  };
}

const Assessment = () => {
  const { profile } = useUserProfile();
  const navigate = useNavigate();
  const [isGuest, setIsGuest] = useState<boolean | null>(null); // null = loading
  const [guestResult, setGuestResult] = useState<AssessmentResult | null>(null);

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
  const isOnline = useOnlineStatus();
  const assessmentDraft = useOfflineDraft<{
    answers: Record<number, number>;
    currentPage: number;
    takingAssessment: boolean;
  }>('assessment', null);
  const [pendingOfflineSubmit, setPendingOfflineSubmit] = useState(false);

  // Hydrate from offline draft on first mount
  useEffect(() => {
    if (assessmentDraft.draft) {
      setAnswers(assessmentDraft.draft.answers || {});
      setCurrentPage(assessmentDraft.draft.currentPage || 0);
      if (assessmentDraft.draft.takingAssessment) setTakingAssessment(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist answers + page on every change
  useEffect(() => {
    if (takingAssessment) {
      assessmentDraft.saveDraft({ answers, currentPage, takingAssessment });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, currentPage, takingAssessment]);

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
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  // Auto-advance
  useEffect(() => {
    if (!takingAssessment || showIntro) return;
    const allAnswered = currentQuestions.every(q => answers[q.id] !== undefined);
    if (!allAnswered || currentPage >= totalPages - 1) return;

    const nextPage = currentPage + 1;
    const nextSectionKey = SECTION_START_PAGES[nextPage];
    const timer = setTimeout(() => {
      if (nextSectionKey) setShowIntro(nextSectionKey);
      else setCurrentPage(nextPage);
    }, 400);
    return () => clearTimeout(timer);
  }, [answers, currentPage, currentQuestions, takingAssessment, showIntro, totalPages]);

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
    setTakingAssessment(true);
    setShowIntro('personality');
  };

  const handleSubmit = async () => {
    if (isGuest) {
      // Guest: calculate results locally — works offline.
      setGuestSubmitting(true);
      try {
        if (Object.keys(answers).length !== 45) {
          return;
        }
        const result = calculateScoresLocally(answers);
        setGuestResult({
          id: 'guest',
          created_at: new Date().toISOString(),
          ...result,
        });
        setTakingAssessment(false);
        setAnswers({});
        setCurrentPage(0);
        assessmentDraft.clearDraft();
      } finally {
        setGuestSubmitting(false);
      }
    } else {
      // Authenticated: requires network to save to DB
      if (!isOnline) {
        setPendingOfflineSubmit(true);
        return;
      }
      // Clear the pending flag immediately so the auto-sync effect can't re-trigger
      // while submitAssessment is in flight.
      setPendingOfflineSubmit(false);
      const success = await submitAssessment(answers);
      if (success) {
        setTakingAssessment(false);
        setAnswers({});
        setCurrentPage(0);
        assessmentDraft.clearDraft();
        feedbackModal.triggerFeedback();
      } else if (!isOnline) {
        // Lost connection mid-submit — re-arm the queue
        setPendingOfflineSubmit(true);
      }
    }
  };

  // Auto-sync when connection returns. `submitting` guards against re-entry
  // while the in-flight submission is still pending.
  useEffect(() => {
    if (isOnline && pendingOfflineSubmit && !isGuest && !submitting) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, pendingOfflineSubmit, isGuest, submitting]);

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
            <Progress value={progressPercent} className="h-1.5" />
          </div>
          <Card>
            <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-5">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${intro.bg}`}>
                <Icon className={`h-8 w-8 ${intro.color}`} />
              </div>
              <div className="space-y-1">
                <Badge variant="secondary" className="text-xs mb-2">Questions {intro.questionRange}</Badge>
                <h2 className="text-xl font-semibold">{intro.title}</h2>
              </div>
              <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">{intro.description}</p>
              <Button size="lg" onClick={handleIntroNext} className="mt-2">
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
              <Progress value={progressPercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{answeredCount} of {TOTAL_QUESTIONS} answered</p>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {currentQuestions.map((q, idx) => (
              <Card key={q.id} className={`border-l-4 transition-colors ${answers[q.id] !== undefined ? 'border-l-primary' : 'border-l-primary/20'}`}>
                <CardContent className="pt-6">
                  <p className="font-medium mb-4">
                    <span className="text-muted-foreground mr-2">{currentPage * QUESTIONS_PER_PAGE + idx + 1}.</span>
                    {q.text}
                  </p>
                  <RadioGroup
                    value={answers[q.id]?.toString() || ''}
                    onValueChange={(val) => handleAnswer(q.id, parseInt(val))}
                    className="space-y-2"
                  >
                    {LIKERT_OPTIONS.map(opt => (
                      <div
                        key={opt.value}
                        className={`flex items-center space-x-3 p-2 rounded-lg transition-colors cursor-pointer ${
                          answers[q.id] === opt.value ? 'bg-primary/10 border border-primary/30' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleAnswer(q.id, opt.value)}
                      >
                        <RadioGroupItem value={opt.value.toString()} id={`q${q.id}-${opt.value}`} />
                        <Label htmlFor={`q${q.id}-${opt.value}`} className="cursor-pointer flex-1 text-sm">{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </CardContent>
              </Card>
            ))}
          </div>

          {allCurrentAnswered && !isLastPage && (
            <p className="text-center text-xs text-muted-foreground animate-pulse">
              All answered — advancing automatically...
            </p>
          )}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={currentPage === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Previous
            </Button>
            {isLastPage ? (
              <Button
                onClick={handleSubmit}
                disabled={answeredCount < TOTAL_QUESTIONS || submitting || guestSubmitting}
                title={!isOnline && !isGuest ? 'Will submit automatically when you reconnect' : undefined}
              >
                {pendingOfflineSubmit
                  ? 'Will submit when online'
                  : (submitting || guestSubmitting)
                    ? 'Submitting...'
                    : !isOnline && !isGuest
                      ? 'Submit when online'
                      : 'Submit Assessment'}
                <ClipboardCheck className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleNext} disabled={!allCurrentAnswered}>
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
          <Card className="text-center">
            <CardContent className="pt-8 pb-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold">Discover Your Career Profile</h2>
              <p className="text-muted-foreground text-sm max-w-md mx-auto">
                Answer 45 questions across Personality, Skills Preference, and Work Interest to discover your RIASEC career profile and unlock personalized recommendations.
              </p>
              {isGuest && (
                <p className="text-xs text-primary font-medium">✨ No sign-up required — take it free right now</p>
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
              <Button size="lg" onClick={handleStartAssessment}>
                Start Assessment <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
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

  const personalityKeys = [
    { label: 'Leadership', qIds: [1, 7, 14] },
    { label: 'Independence', qIds: [2, 8] },
    { label: 'Adaptability', qIds: [3, 13] },
    { label: 'Social', qIds: [4, 9, 11, 15] },
    { label: 'Detail', qIds: [5, 12] },
    { label: 'Drive', qIds: [10, 6] },
  ];

  const personalityRadar = personalityKeys.map(({ label, qIds }) => {
    const vals = qIds.map(id => (activeResult.personality_score_json as Record<string, number>)[`q${id}`] || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { axis: label, value: Math.round((avg / 5) * 100) };
  });

  const skillsMap = [
    { label: 'Writing', qIds: [16] },
    { label: 'Data', qIds: [17, 24] },
    { label: 'Tech', qIds: [18, 28] },
    { label: 'Presenting', qIds: [19] },
    { label: 'Planning', qIds: [20, 27] },
    { label: 'Problem Solving', qIds: [21, 26] },
    { label: 'Design', qIds: [22] },
    { label: 'Negotiation', qIds: [23] },
    { label: 'Relationships', qIds: [25, 29, 30] },
  ];

  const skillsChartData = skillsMap.map(({ label, qIds }) => {
    const vals = qIds.map(id => (activeResult.skills_score_json as Record<string, number>)[`q${id}`] || 0);
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    return { name: label, score: Math.round((avg / 5) * 100) };
  }).sort((a, b) => b.score - a.score);

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
                    <p className="font-medium text-sm">Sign up to save your results</p>
                    <p className="text-xs text-muted-foreground">Create a free account to save your assessment, get career recommendations, and track your progress.</p>
                  </div>
                </div>
                <Button size="sm" onClick={() => navigate('/', { state: { openAuth: true } })}>
                  Create Account <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Header */}
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
              <Button variant="outline" onClick={handleStartAssessment} disabled={!canRetake()}>
                <RotateCcw className="h-4 w-4 mr-2" /> Retake Assessment
              </Button>
            </div>
          )}
        </div>

        {/* Top 3 Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Your Top Interest Areas
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

        {/* RIASEC Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5 text-primary" />
              Work Interest — RIASEC Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={riasecChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, 'Score']}
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  />
                  <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                    {riasecChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={SECTION_COLORS[entry.name] || 'hsl(var(--primary))'} opacity={index < 3 ? 1 : 0.45} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Personality + Skills */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4 text-primary" /> Personality Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={personalityRadar} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
                    <Radar name="Personality" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
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
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={skillsChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} fill="hsl(var(--accent))" fillOpacity={0.85} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-1">Scores aggregated from skills questions (16–30)</p>
            </CardContent>
          </Card>
        </div>

        {/* Career Recommendations */}
        <CareerRecommendations
          recommendations={recommendations}
          clusterInsight={clusterInsight}
          primaryInterest={activeResult.primary_interest}
          secondaryInterest={activeResult.secondary_interest}
          tertiaryInterest={activeResult.tertiary_interest}
          loading={careersLoading}
          isGuest={isGuest || false}
        />

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
          <Card className="border-primary/30 bg-primary/5 text-center">
            <CardContent className="pt-6 pb-6 space-y-3">
              <h3 className="font-semibold text-lg">Ready to take the next step?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Create a free account to save your results, build your CV, practice interviews, and apply to jobs.
              </p>
              <Button size="lg" onClick={() => navigate('/', { state: { openAuth: true } })}>
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
