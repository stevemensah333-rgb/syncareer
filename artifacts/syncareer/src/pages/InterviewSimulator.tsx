import { useState, useEffect, useRef } from 'react';

import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Phone, Clock, Zap, Target, Lock, Sparkles, Trash2, History, Briefcase, MapPin, ArrowRight } from 'lucide-react';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InterviewErrorBoundary } from '@/components/interview/InterviewErrorBoundary';
import { VoiceInterviewMode } from '@/components/interview/VoiceInterviewMode';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import AnimatedSection from '@/components/landing/AnimatedSection';

import type { InterviewSetupConfig } from '@/types/interview';
import { SESSION_OPTIONS } from '@/features/interview/constants';
import type { SessionLengthOption } from '@/features/interview/constants';
import { classifyMicrophoneError, type DeviceReadiness } from '@/features/interview/setup';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type SessionLength = SessionLengthOption['value'];

const SESSION_ICONS: Record<SessionLength, typeof Zap> = {
  quick: Zap,
  standard: Target,
  extended: Clock,
};

const InterviewSimulator = () => {
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'setup' | 'readiness' | 'interview'>('setup');
  const [readiness, setReadiness] = useState<DeviceReadiness>('unchecked');
  const startRequested = useRef(false);
  const setupEmittedRef = useRef(false);
  const [sessionLength, setSessionLength] = useState<SessionLength>('standard');
  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(searchParams.get('application'));
  const feedbackModal = useFeedbackModal('interview_simulator');
  
  const [config, setConfig] = useState<InterviewSetupConfig>({
    jobRole: '',
    industry: '',
    difficulty: 'intermediate',
    interviewType: 'mixed',
    resumeText: '',
    jobDescription: '',
  });

  // Prefill from query params (?role=&industry=&skills=&jd=) when arriving from Opportunities
  useEffect(() => {
    const role = searchParams.get('role');
    const industry = searchParams.get('industry');
    const skills = searchParams.get('skills');
    const jd = searchParams.get('jd');
    if (!role && !industry && !skills && !jd) return;
    setConfig(prev => ({
      ...prev,
      jobRole: role || prev.jobRole,
      industry: industry || prev.industry,
      jobDescription: jd || (skills ? `Required skills: ${skills}` : prev.jobDescription),
    }));
  }, [searchParams]);

  // Analytics: setup opened
  useEffect(() => {
    if (setupEmittedRef.current) return;
    setupEmittedRef.current = true;
    const hasRole = Boolean(searchParams.get('role') || searchParams.get('skills') || searchParams.get('jd'));
    const hasApp = Boolean(searchParams.get('application'));
    const entry = hasApp ? 'application' : hasRole ? 'opportunity' : 'navigation';
    try {
      captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SETUP_OPENED, { entry });
    } catch {}
  }, [searchParams]);

  const { data: interviewHistory, isLoading: _historyLoading } = useQuery({
    queryKey: ['mock_interviews_history'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('mock_interviews')
        .select('id, job_role, industry, difficulty, overall_score, status, created_at, completed_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: applications } = useQuery({
    queryKey: ['applications_for_interview_setup'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from('job_applications')
        .select('id, job:job_postings(title, company_name, department, description, skills)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Fetch active job postings for "Practice for a real job"
  const { data: liveJobs } = useQuery({
    queryKey: ['live_jobs_for_interview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('id, title, location, employment_type, skills, description, company_name, department')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const deleteInterview = async (id: string) => {
    const { error } = await supabase.from('mock_interviews').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete interview');
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['mock_interviews_history'] });
    toast.success('Interview removed');
  };

  const updateConfig = (field: keyof InterviewSetupConfig, value: string) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const startInterview = () => {
    if (!config.jobRole.trim()) {
      toast.error('Please enter a job role');
      return;
    }
    setReadiness('unchecked');
    setStep('readiness');
  };

  const checkReadiness = async () => {
    if (readiness === 'checking') return;
    setReadiness('checking');
    let next: DeviceReadiness = 'ready';
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw { name: 'NotFoundError' };
      if (!('speechSynthesis' in window)) throw new Error('Audio output unavailable');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      next = 'ready';
      setReadiness('ready');
    } catch (error) {
      next = classifyMicrophoneError(error);
      setReadiness(next);
    }
    try {
      const resultMap: Record<DeviceReadiness, 'ready' | 'missing' | 'denied' | 'failed'> = {
        unchecked: 'failed',
        checking: 'failed',
        ready: 'ready',
        denied: 'denied',
        missing: 'missing',
        failed: 'failed',
      };
      captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_DEVICE_CHECKED, { result: resultMap[next] ?? 'failed' });
    } catch {}
  };

  const beginReadyInterview = () => {
    if (readiness !== 'ready' || startRequested.current) return;
    startRequested.current = true;
    setStep('interview');
  };

  return (
    <PageLayout title="Interview Simulator" description="Practise a role-specific voice interview and review your feedback." breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Practice", to: "/practice" }, { label: "Interview Simulator" }]}>
      {step === 'setup' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Setup Form */}
              <AnimatedSection delay={0.08} y={20}>
              <Card>
                <CardHeader>
                  <CardTitle>Set Up Your Interview</CardTitle>
                  <CardDescription>
                    Customize your practice session based on your target role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Practice context</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Button type="button" variant="outline" onClick={() => { setSelectedApplicationId(null); setConfig({ jobRole: '', industry: '', difficulty: config.difficulty, interviewType: config.interviewType, resumeText: '', jobDescription: '' }); }}>Standalone practice</Button>
                      {(applications ?? []).map((application) => {
                        const job = Array.isArray(application.job) ? application.job[0] : application.job;
                        if (!job?.title) return null;
                        const organisation = job.company_name || job.department || '';
                        return <Button key={application.id} type="button" variant="outline" className="h-auto justify-start whitespace-normal text-left" onClick={() => { setSelectedApplicationId(application.id); setConfig((previous) => ({ ...previous, jobRole: job.title, industry: organisation, jobDescription: job.description || (job.skills?.length ? `Role skills: ${job.skills.join(', ')}` : ''), resumeText: '' })); }}>{job.title}{organisation ? ` · ${organisation}` : ''}</Button>;
                      })}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="jobRole">Target Job Role *</Label>
                      <Input
                        id="jobRole"
                        value={config.jobRole}
                        onChange={(e) => updateConfig('jobRole', e.target.value)}
                        placeholder="e.g., Software Developer"
                        aria-required="true"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="industry">Organisation or industry</Label>
                      <Input
                        id="industry"
                        value={config.industry}
                        onChange={(e) => updateConfig('industry', e.target.value)}
                        placeholder="e.g., Technology"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Seniority Level</Label>
                      <Select value={config.difficulty} onValueChange={(v) => updateConfig('difficulty', v)}>
                        <SelectTrigger id="difficulty">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="beginner">Entry-level / Internship</SelectItem>
                          <SelectItem value="intermediate">Mid-level (2-5 years)</SelectItem>
                          <SelectItem value="advanced">Senior level</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="interviewType">Interview Type</Label>
                      <Select value={config.interviewType} onValueChange={(v) => updateConfig('interviewType', v)}>
                        <SelectTrigger id="interviewType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="behavioral">Behavioral</SelectItem>
                          <SelectItem value="technical">Technical</SelectItem>
                          <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Session Length Selector */}
                  <div className="space-y-2">
                    <Label id="session-length-label">Session Length</Label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-labelledby="session-length-label">
                      {SESSION_OPTIONS.map((opt) => {
                        const Icon = SESSION_ICONS[opt.value];
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSessionLength(opt.value)}
                            aria-pressed={sessionLength === opt.value}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all hover:border-primary/50",
                              sessionLength === opt.value
                                ? "border-primary bg-primary/5"
                                : "border-border"
                            )}
                          >
                            <Icon className={cn("h-5 w-5", sessionLength === opt.value ? "text-primary" : "text-muted-foreground")} />
                            <span className="text-sm font-medium">{opt.label}</span>
                            <span className="text-xs text-muted-foreground">{opt.description}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resumeText">Resume / Experience Summary (Optional)</Label>
                    <Textarea
                      id="resumeText"
                      value={config.resumeText}
                      onChange={(e) => updateConfig('resumeText', e.target.value)}
                      placeholder="Paste your resume text or key experiences here for more personalized questions..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description (Optional)</Label>
                    <Textarea
                      id="jobDescription"
                      value={config.jobDescription}
                      onChange={(e) => updateConfig('jobDescription', e.target.value)}
                      placeholder="Paste the job description for role-specific questions..."
                      rows={3}
                    />
                  </div>

                  {!isPremium && (
                    <div className="flex items-center gap-2 p-3 rounded-md bg-muted border border-border text-sm text-muted-foreground">
                      <Lock className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span>Voice interview is a <strong className="text-foreground">Premium feature</strong>.</span>
                      <Button size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => navigate('/pricing')}>
                        Upgrade
                      </Button>
                    </div>
                  )}

                  <Button
                    className="w-full rounded-full"
                    size="lg"
                    onClick={isPremium ? startInterview : () => navigate('/pricing')}
                    aria-label="Start voice interview session"
                  >
                    {isPremium ? (
                      <><Phone className="h-4 w-4 mr-2" aria-hidden="true" />Start Voice Interview</>
                    ) : (
                      <><Sparkles className="h-4 w-4 mr-2" aria-hidden="true" />Upgrade to Unlock</>
                    )}
                  </Button>
                </CardContent>
              </Card>
              </AnimatedSection>

              {/* Practice for a real job */}
              {liveJobs && liveJobs.length > 0 && (
                <AnimatedSection delay={0.12} y={20}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-primary" />
                      Or practice for an open position
                    </CardTitle>
                    <CardDescription>
                      Prepare for a real job listing with a tailored interview
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {liveJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => {
                          setSelectedApplicationId(null);
                          setConfig(prev => ({
                            ...prev,
                            jobRole: job.title,
                            industry: job.company_name || job.department || '',
                            jobDescription: job.description || '',
                            difficulty: 'beginner',
                          }));
                          toast.success(`Interview setup pre-filled for "${job.title}"`);
                        }}
                        className="w-full flex items-center justify-between gap-3 rounded-lg border p-3 text-left hover:border-primary/30 hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{job.title}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {job.location} · {job.employment_type}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </CardContent>
                </Card>
                </AnimatedSection>
              )}

              {/* How it works */}
              <AnimatedSection delay={0.16} y={20}>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">How It Works</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm text-muted-foreground" aria-label="Interview process steps">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Multi-round interview: Intro → Technical → Behavioral → Scenario → Closing
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Adaptive difficulty — questions get harder as you perform well
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Follow-up probes on weak answers to test depth of understanding
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Detailed per-question feedback with improved answer examples
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" aria-hidden="true" />
                      Comprehensive final report with category scores and next steps
                    </li>
                  </ul>
                </CardContent>
              </Card>
              </AnimatedSection>

              {/* Interview History */}
              {(interviewHistory && interviewHistory.length > 0) && (
                <AnimatedSection delay={0.2} y={20}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <CardTitle className="text-lg">Past Sessions</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {interviewHistory.map((interview) => {
                      const score = interview.overall_score;
                      const scoreColor = score === null ? 'text-muted-foreground' : score >= 75 ? 'text-green-600 dark:text-green-400' : score >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-destructive';
                      const date = new Date(interview.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                      return (
                        <div key={interview.id} className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2.5 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{interview.job_role}</p>
                            <p className="text-xs text-muted-foreground">{date} · {interview.difficulty}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {interview.status === 'completed' && score !== null ? (
                              <span className={cn('font-semibold tabular-nums', scoreColor)}>{score}/100</span>
                            ) : (
                              <Badge variant="secondary" className="text-xs">{interview.status}</Badge>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete interview?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently remove the session for <strong>{interview.job_role}</strong>. This cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteInterview(interview.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
                </AnimatedSection>
              )}
          </div>
        </div>
      )}

      {step === 'readiness' && (
        <div className="mx-auto max-w-xl rounded-lg border bg-card p-6 space-y-5">
          <div><h2 className="text-lg font-semibold">Check your microphone</h2><p className="mt-1 text-sm text-muted-foreground">Syncareer uses your microphone to transcribe answers during this AI practice interview. Camera and screen sharing are never requested. Interview responses and feedback are stored with your account by the existing interview service.</p></div>
          <div role="status" className="rounded-md bg-muted p-3 text-sm">
            {readiness === 'unchecked' && 'Your microphone has not been checked.'}
            {readiness === 'checking' && 'Requesting microphone access…'}
            {readiness === 'ready' && 'Microphone is ready. Audio output uses your browser text-to-speech support.'}
            {readiness === 'denied' && 'Microphone permission was denied. Update browser permissions, then try again.'}
            {readiness === 'missing' && 'No usable microphone or browser media-device support was found.'}
            {readiness === 'failed' && 'The microphone check failed. Close other apps using the device and retry.'}
          </div>
          <p className="text-xs text-muted-foreground">Typed-answer fallback is not exposed because the current active interview UI and supported contract have not been verified for typed sessions.</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setStep('setup')}>Back</Button><Button variant="outline" disabled={readiness === 'checking'} onClick={() => void checkReadiness()}>{readiness === 'checking' ? 'Checking…' : readiness === 'ready' ? 'Check again' : 'Check microphone'}</Button><Button disabled={readiness !== 'ready' || startRequested.current} onClick={beginReadyInterview}>Start interview</Button></div>
        </div>
      )}

      {step === 'interview' && (
        <div className="max-w-3xl mx-auto">
          <InterviewErrorBoundary
            onReset={() => setStep('setup')}
            fallbackTitle="Interview session crashed"
          >
            <VoiceInterviewMode
              jobRole={config.jobRole}
              industry={config.industry}
              difficulty={config.difficulty}
              interviewType={config.interviewType}
              resumeText={config.resumeText}
              jobDescription={config.jobDescription}
              sessionLength={sessionLength}
              applicationId={selectedApplicationId}
              autoStart
              onRetry={() => {
                try { captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_RETRIED, { from: 'session' }); } catch {}
                startRequested.current = false;
                setReadiness('unchecked');
                setStep('readiness');
              }}
              onEnd={() => {
                startRequested.current = false;
                setStep('setup');
                queryClient.invalidateQueries({ queryKey: ['mock_interviews_history'] });
                feedbackModal.triggerFeedback();
                toast.success('Interview session closed.');
              }}
            />
          </InterviewErrorBoundary>
        </div>
      )}

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </PageLayout>
  );
};

export default InterviewSimulator;
