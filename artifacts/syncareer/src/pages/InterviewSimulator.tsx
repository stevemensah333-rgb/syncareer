import { useState, useEffect } from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Mic, CheckCircle, Phone, Clock, Zap, Target, Lock, Sparkles, Trash2, History, Briefcase, MapPin, ArrowRight } from 'lucide-react';
import { WhatsAppShareButton } from '@/components/shared/WhatsAppShareButton';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { InterviewErrorBoundary } from '@/components/interview/InterviewErrorBoundary';
import { VoiceInterviewMode } from '@/components/interview/VoiceInterviewMode';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { useSubscription } from '@/hooks/useSubscription';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

import type { InterviewSetupConfig } from '@/types/interview';

type SessionLength = 'quick' | 'standard' | 'extended';

const SESSION_OPTIONS: Array<{ value: SessionLength; label: string; description: string; questions: number; icon: typeof Zap }> = [
  { value: 'quick', label: 'Quick', description: '~15 min · 8 questions', questions: 8, icon: Zap },
  { value: 'standard', label: 'Standard', description: '~30 min · 15 questions', questions: 15, icon: Target },
  { value: 'extended', label: 'Deep Dive', description: '~45 min · 20 questions', questions: 20, icon: Clock },
];

const InterviewSimulator = () => {
  const { studentDetails } = useUserProfile();
  const { isPremium } = useSubscription();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'setup' | 'interview'>('setup');
  const [sessionLength, setSessionLength] = useState<SessionLength>('standard');
  const feedbackModal = useFeedbackModal('interview_simulator');
  const [config, setConfig] = useState<InterviewSetupConfig>({
    jobRole: '',
    industry: '',
    difficulty: 'intermediate',
    interviewType: 'mixed',
    resumeText: '',
    jobDescription: '',
  });

  // Dynamic pre-fill from assessment results + saved CV
  useEffect(() => {
    const prefill = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load assessment-based role/industry
      const { data: assessment } = await supabase
        .from('assessments')
        .select('primary_interest')
        .eq('user_id', user.id)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (assessment?.primary_interest) {
        setConfig(prev => ({
          ...prev,
          jobRole: prev.jobRole || assessment.primary_interest || '',
          industry: prev.industry || assessment.primary_interest || '',
        }));
      } else if (studentDetails?.major) {
        // Fallback: use major as a rough guide
        setConfig(prev => ({
          ...prev,
          jobRole: prev.jobRole || studentDetails.major,
          industry: prev.industry || studentDetails.major,
        }));
      }

      // Load saved CV as resume context
      const { data: resume } = await supabase
        .from('resumes')
        .select('personal_info, education, experience, skills, projects')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .maybeSingle();

      if (resume) {
        const pi = resume.personal_info as any;
        const skills = Array.isArray(resume.skills) ? (resume.skills as string[]).join(', ') : '';
        const expSummary = Array.isArray(resume.experience)
          ? (resume.experience as any[]).map((e: any) => `${e.role || ''} at ${e.company || ''}`).filter(Boolean).join('; ')
          : '';
        const resumeText = [
          pi?.firstName ? `${pi.firstName} ${pi.lastName || ''}` : '',
          skills ? `Skills: ${skills}` : '',
          expSummary ? `Experience: ${expSummary}` : '',
        ].filter(Boolean).join('\n');

        if (resumeText.trim()) {
          setConfig(prev => ({ ...prev, resumeText: prev.resumeText || resumeText }));
        }
      }
    };
    prefill();
  }, [studentDetails]);

  const { data: interviewHistory, isLoading: historyLoading } = useQuery({
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

  // Fetch active job postings for "Practice for a real job"
  const { data: liveJobs } = useQuery({
    queryKey: ['live_jobs_for_interview'],
    queryFn: async () => {
      const { data } = await supabase
        .from('job_postings')
        .select('id, title, location, employment_type, skills, description')
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

  const isOnline = useOnlineStatus();
  const startInterview = () => {
    if (!config.jobRole.trim()) {
      toast.error('Please enter a job role');
      return;
    }
    if (!isOnline) {
      toast.error("AI voice interview needs internet — reconnect to start a session.");
      return;
    }
    setStep('interview');
  };

  return (
    <PageLayout title="Interview Simulator">
      {step === 'setup' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <Card className="bg-gradient-to-br from-primary/10 to-accent/10 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center" aria-hidden="true">
                  <Mic className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">AI Voice Interview</h2>
                  <p className="text-muted-foreground">
                    Practice with a realistic AI interviewer using voice conversation
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="max-w-2xl mx-auto space-y-6">
            {/* Setup Form */}
              <Card>
                <CardHeader>
                  <CardTitle>Set Up Your Interview</CardTitle>
                  <CardDescription>
                    Customize your practice session based on your target role
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <Label htmlFor="industry">Industry</Label>
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
                    <Label>Session Length</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {SESSION_OPTIONS.map((opt) => {
                        const Icon = opt.icon;
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setSessionLength(opt.value)}
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
                    className="w-full"
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

              {/* Practice for a real job */}
              {liveJobs && liveJobs.length > 0 && (
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
                          setConfig(prev => ({
                            ...prev,
                            jobRole: job.title,
                            industry: job.employment_type,
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
              )}

              {/* How it works */}
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

              {/* Interview History */}
              {(interviewHistory && interviewHistory.length > 0) && (
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
              )}
          </div>
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
              onEnd={() => {
                setStep('setup');
                queryClient.invalidateQueries({ queryKey: ['mock_interviews_history'] });
                feedbackModal.triggerFeedback();
                toast.success('Interview complete! Share your achievement.', {
                  action: {
                    label: 'Share on WhatsApp',
                    onClick: () => {
                      const msg = encodeURIComponent(`I just completed a mock interview for "${config.jobRole}" on Syncareer! Practice yours free: ${window.location.origin}`);
                      window.open(`https://wa.me/?text=${msg}`, '_blank');
                    },
                  },
                });
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
