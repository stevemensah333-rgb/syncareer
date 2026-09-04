import { useState, useEffect, useRef } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle,
  Clock,
  Zap,
  Target,
  Trash2,
  History,
  Briefcase,
  MapPin,
  ArrowRight,
  Mic,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InterviewErrorBoundary } from '@/components/interview/InterviewErrorBoundary';
import { VoiceInterviewMode } from '@/components/interview/VoiceInterviewMode';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { InterviewSetupConfig } from '@/types/interview';
import { SESSION_OPTIONS } from '@/features/interview/constants';
import type { SessionLengthOption } from '@/features/interview/constants';
import { classifyMicrophoneError, type DeviceReadiness } from '@/features/interview/setup';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type SessionLength = SessionLengthOption['value'];

const InterviewSimulator = () => {
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

  // Prefill from query params when arriving from Opportunities or Applications
  useEffect(() => {
    const role = searchParams.get('role');
    const industry = searchParams.get('industry');
    const skills = searchParams.get('skills');
    const jd = searchParams.get('jd');
    if (!role && !industry && !skills && !jd) return;
    setConfig((prev) => ({
      ...prev,
      jobRole: role || prev.jobRole,
      industry: industry || prev.industry,
      jobDescription: jd || (skills ? `Required skills: ${skills}` : prev.jobDescription),
    }));
  }, [searchParams]);

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

  const { data: interviewHistory } = useQuery({
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
      const { data } = await supabase
        .from('job_applications')
        .select('id, job:job_postings(title, company_name, department, description, skills)')
        .eq('applicant_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

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
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  const startInterview = () => {
    if (!config.jobRole.trim()) {
      toast.error('Please enter a target job role');
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
    <PageLayout
      title="Interview Simulator"
      description="Practise role-specific voice interviews with structured signal feedback and multi-round progression."
      breadcrumbs={[
        { label: 'Home', to: '/dashboard' },
        { label: 'Practice', to: '/practice' },
        { label: 'Interview Simulator' },
      ]}
    >
      {step === 'setup' && (
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="mx-auto max-w-2xl space-y-6">
            {/* Setup Form */}
            <Card className="rounded-surface border border-border bg-card shadow-card">
              <CardHeader className="pb-3">
                {/* h2 (not CardTitle's h3): this card is the page's only
                    top-level section; an h3 directly under the page h1 breaks
                    heading order. */}
                <h2 className="text-base font-semibold leading-tight tracking-tight flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" aria-hidden="true" />
                  Set Up Your Practice Interview
                </h2>
                <CardDescription className="text-xs text-muted-foreground">
                  Customize the difficulty, round structure, and role requirements for your practice session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Practice Context Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Practice context
                  </Label>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button
                      type="button"
                      variant={selectedApplicationId === null ? 'default' : 'outline'}
                      className="rounded-control text-xs"
                      onClick={() => {
                        setSelectedApplicationId(null);
                        setConfig({
                          jobRole: '',
                          industry: '',
                          difficulty: config.difficulty,
                          interviewType: config.interviewType,
                          resumeText: '',
                          jobDescription: '',
                        });
                      }}
                    >
                      Standalone practice
                    </Button>
                    {(applications ?? []).map((application) => {
                      const job = Array.isArray(application.job) ? application.job[0] : application.job;
                      if (!job?.title) return null;
                      const organisation = job.company_name || job.department || '';
                      const isSelected = selectedApplicationId === application.id;
                      return (
                        <Button
                          key={application.id}
                          type="button"
                          variant={isSelected ? 'default' : 'outline'}
                          className="h-auto justify-start text-left rounded-control text-xs p-2.5 min-w-0"
                          onClick={() => {
                            setSelectedApplicationId(application.id);
                            setConfig((prev) => ({
                              ...prev,
                              jobRole: job.title,
                              industry: organisation,
                              jobDescription: job.description || (job.skills?.length ? `Role skills: ${job.skills.join(', ')}` : ''),
                              resumeText: '',
                            }));
                          }}
                        >
                          <span className="truncate">
                            {job.title} {organisation ? `· ${organisation}` : ''}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="jobRole" className="text-xs font-medium">Target Job Role <span className="text-destructive">*</span></Label>
                    <Input
                      id="jobRole"
                      placeholder="e.g. Associate Product Manager"
                      value={config.jobRole}
                      onChange={(e) => updateConfig('jobRole', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="industry" className="text-xs font-medium">Industry / Organization (optional)</Label>
                    <Input
                      id="industry"
                      placeholder="e.g. Fintech / Standard Bank"
                      value={config.industry}
                      onChange={(e) => updateConfig('industry', e.target.value)}
                      className="rounded-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="difficulty" className="text-xs font-medium">Seniority / Difficulty</Label>
                    <Select
                      value={config.difficulty}
                      onValueChange={(val: any) => updateConfig('difficulty', val)}
                    >
                      <SelectTrigger id="difficulty" className="rounded-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-overlay">
                        <SelectItem value="beginner" className="text-xs">Entry-level / Internship</SelectItem>
                        <SelectItem value="intermediate" className="text-xs">Mid-level (2–5 years)</SelectItem>
                        <SelectItem value="advanced" className="text-xs">Senior level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="interviewType" className="text-xs font-medium">Interview Type Focus</Label>
                    <Select
                      value={config.interviewType}
                      onValueChange={(val: any) => updateConfig('interviewType', val)}
                    >
                      <SelectTrigger id="interviewType" className="rounded-input text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-overlay">
                        <SelectItem value="mixed" className="text-xs">Comprehensive (Mixed)</SelectItem>
                        <SelectItem value="behavioral" className="text-xs">Behavioral & Situational</SelectItem>
                        <SelectItem value="technical" className="text-xs">Technical Depth</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Session Length Cards */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Session length & scope
                  </Label>
                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                    {SESSION_OPTIONS.map((option) => {
                      const isSelected = sessionLength === option.value;
                      const Icon = option.value === 'quick' ? Zap : option.value === 'standard' ? Target : Clock;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setSessionLength(option.value)}
                          className={cn(
                            'rounded-surface border p-3 text-left transition-colors duration-150',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                              : 'border-border bg-card hover:border-border/80'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={cn('h-4 w-4', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                            <span className="text-xs font-semibold text-foreground">{option.label}</span>
                          </div>
                          <p className="mt-1 text-[11px] text-muted-foreground leading-tight">{option.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Job Description */}
                <div className="space-y-1.5">
                  <Label htmlFor="jobDescription" className="text-xs font-medium">
                    Job Description / Requirements (optional)
                  </Label>
                  <Textarea
                    id="jobDescription"
                    placeholder="Paste job posting requirements or key skills to tailor the interview questions..."
                    value={config.jobDescription}
                    onChange={(e) => updateConfig('jobDescription', e.target.value)}
                    rows={2}
                    className="rounded-input text-xs"
                  />
                </div>

                <Button onClick={startInterview} className="w-full rounded-control">
                  <Mic className="mr-1.5 h-4 w-4" />
                  Continue to microphone check
                </Button>
              </CardContent>
            </Card>

            {/* Live Opportunities Suggestions */}
            {(liveJobs && liveJobs.length > 0) && (
              <Card className="rounded-surface border border-border bg-card shadow-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    Practice with active opportunity postings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {liveJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => {
                        setConfig((prev) => ({
                          ...prev,
                          jobRole: job.title,
                          industry: job.company_name || job.department || '',
                          jobDescription: job.description || (job.skills?.length ? `Role skills: ${job.skills.join(', ')}` : ''),
                        }));
                        toast.success(`Interview setup pre-filled for "${job.title}"`);
                      }}
                      className="w-full flex items-center justify-between gap-3 rounded-surface border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-xs text-foreground truncate">{job.title}</p>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3" /> {job.company_name || 'Organization'} · {job.location || 'Location'}
                        </p>
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* How It Works Structured Card */}
            <Card className="rounded-surface border border-border bg-card shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Practice Architecture & Methodology
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-muted-foreground" aria-label="Interview process steps">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <span><strong>Multi-round structure:</strong> Intro → Technical Depth → Behavioral Context → Scenario Problem → Closing.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <span><strong>Adaptive follow-up probes:</strong> Follow-ups test depth and concrete evidence where answers need detail.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
                    <span><strong>6 evaluation dimensions:</strong> Strengths, missing depth, technical understanding, communication, evidence used, and next improvement.</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Past Sessions List */}
            {interviewHistory && interviewHistory.length > 0 && (
              <Card className="rounded-surface border border-border bg-card shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-sm font-semibold">Past Practice Sessions</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {interviewHistory.map((interview) => {
                    const date = new Date(interview.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    return (
                      <div
                        key={interview.id}
                        className="flex items-center justify-between gap-3 rounded-surface border border-border bg-card px-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{interview.job_role}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{date} · {interview.difficulty}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="secondary" className="text-[11px] rounded-control capitalize">
                            {interview.status}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-control text-muted-foreground hover:text-destructive"
                                aria-label={`Delete interview for ${interview.job_role}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="rounded-overlay shadow-overlay">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-base font-semibold">Delete practice session?</AlertDialogTitle>
                                <AlertDialogDescription className="text-xs text-muted-foreground">
                                  This will permanently remove the practice record for <strong>{interview.job_role}</strong>.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="rounded-control text-xs">Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteInterview(interview.id)}
                                  className="rounded-control text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
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
            )}
          </div>
        </div>
      )}

      {/* Step 2: Readiness Check */}
      {step === 'readiness' && (
        <div className="mx-auto max-w-xl rounded-surface border border-border bg-card p-6 shadow-card space-y-5">
          <div>
            <h2 className="text-base font-semibold text-foreground">Microphone & Audio Check</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Syncareer uses your microphone to capture spoken answers in real time. Video and screen sharing are never requested.
            </p>
          </div>

          <div role="status" className="rounded-surface border border-border bg-secondary/50 p-4 text-xs space-y-2">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Mic className="h-4 w-4 text-primary" />
              <span>
                {readiness === 'unchecked' && 'Your microphone has not been checked.'}
                {readiness === 'checking' && 'Requesting microphone access…'}
                {readiness === 'ready' && 'Microphone is connected and active. Audio output uses browser speech synthesis.'}
                {readiness === 'denied' && 'Microphone permission was denied. Please allow microphone access in your browser settings.'}
                {readiness === 'missing' && 'No usable microphone was found.'}
                {readiness === 'failed' && 'Microphone check failed. Close conflicting apps and retry.'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" className="rounded-control text-xs" onClick={() => setStep('setup')}>
              Back to setup
            </Button>
            <Button
              variant="outline"
              className="rounded-control text-xs"
              disabled={readiness === 'checking'}
              onClick={() => void checkReadiness()}
            >
              {readiness === 'checking' ? 'Checking…' : readiness === 'ready' ? 'Check again' : 'Check microphone'}
            </Button>
            <Button
              className="rounded-control text-xs"
              disabled={readiness !== 'ready' || startRequested.current}
              onClick={beginReadyInterview}
            >
              Start interview
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Active Interview */}
      {step === 'interview' && (
        <div className="mx-auto max-w-3xl">
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
                try {
                  captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_RETRIED, { from: 'session' });
                } catch {}
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

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />
    </PageLayout>
  );
};

export default InterviewSimulator;
