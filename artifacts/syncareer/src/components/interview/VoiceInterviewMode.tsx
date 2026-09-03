import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Mic,
  Pause,
  PhoneOff,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Volume2,
  Award,
  TrendingUp,
  ShieldCheck,
  Layers,
  FileCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { INTERVIEW_PHASE_LABELS } from '@/features/interview/lifecycle';
import { deterministicAnswerChecks, pairQuestionAnswers, retryOutline } from '@/features/interview/sessionReport';
import { parseFinalReport } from '@/features/interview/reportParser';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

interface VoiceInterviewModeProps {
  jobRole: string;
  industry?: string;
  difficulty?: string;
  interviewType?: string;
  resumeText?: string;
  jobDescription?: string;
  sessionLength?: 'quick' | 'standard' | 'extended';
  applicationId?: string | null;
  autoStart?: boolean;
  /**
   * Invoked once when the session completes, with the question/answer pairs
   * recognised in this session. Used by the application-context page to offer
   * reviewable evidence suggestions; the standalone simulator ignores it.
   */
  onComplete?: (pairs: Array<{ question: string; answer: string | null }>) => void;
  onEnd: () => void;
  onRetry?: () => void;
}

const excerpt = (text: string | null, length = 180) =>
  text ? `${text.slice(0, length)}${text.length > length ? '…' : ''}` : 'Transcript unavailable.';

const STAGES = ['Intro', 'Technical', 'Behavioral', 'Scenario', 'Closing'] as const;

export function VoiceInterviewMode({
  jobRole,
  industry,
  difficulty,
  interviewType,
  resumeText,
  jobDescription,
  sessionLength = 'standard',
  applicationId = null,
  autoStart = false,
  onComplete,
  onEnd,
  onRetry,
}: VoiceInterviewModeProps) {
  const interview = useVoiceInterview({
    jobRole,
    industry,
    difficulty,
    interviewType,
    resumeContext: resumeText,
    jobDescription,
    sessionLength,
    applicationId,
  });

  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const autoStartedRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const sessionStartedRef = useRef(false);
  const sessionFinishedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void interview.start();
  }, [autoStart, interview.start]);

  useEffect(() => {
    if (showTranscript && transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [interview.messages, interview.currentTranscript, showTranscript]);

  useEffect(() => {
    if (sessionStartedRef.current) return;
    if (interview.phase !== 'idle' && interview.phase !== 'connecting' && interview.phase !== 'error') {
      sessionStartedRef.current = true;
      try {
        captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SESSION_STARTED, { mode: 'voice' });
      } catch {}
    }
  }, [interview.phase]);

  const evidence = useMemo(() => pairQuestionAnswers(interview.messages), [interview.messages]);

  useEffect(() => {
    if (!interview.isCompleted || sessionFinishedRef.current) return;
    sessionFinishedRef.current = true;
    try {
      captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SESSION_FINISHED, { result: 'completed' });
    } catch {}
    try {
      onComplete?.(evidence);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.isCompleted]);

  useEffect(() => {
    if (interview.phase !== 'error' || sessionFinishedRef.current) return;
    if (interview.error) {
      try {
        const lower = interview.error.toLowerCase();
        let failure_code: 'network' | 'device' | 'quota' | 'server' | 'unknown' = 'unknown';
        if (lower.includes('network') || lower.includes('fetch') || lower.includes('connection')) failure_code = 'network';
        else if (lower.includes('microphone') || lower.includes('not-allowed') || lower.includes('permission')) failure_code = 'device';
        else if (lower.includes('rate') || lower.includes('429')) failure_code = 'quota';
        else if (lower.includes('server') || lower.includes('500')) failure_code = 'server';
        captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SESSION_FINISHED, { result: 'failed', failure_code });
        sessionFinishedRef.current = true;
      } catch {}
    }
  }, [interview.phase, interview.error]);

  const statusLabel = INTERVIEW_PHASE_LABELS[interview.phase];
  const progressPercent = interview.progress.total > 0 ? (interview.progress.answered / interview.progress.total) * 100 : 0;
  
  const modelMessage = interview.isCompleted
    ? interview.messages.findLast((message) => message.role === 'assistant' && /interview complete/i.test(message.content))
    : null;
  const modelReport = modelMessage ? parseFinalReport(modelMessage.content) : null;
  
  const assessed = evidence.map((pair) => ({ pair, checks: deterministicAnswerChecks(pair) }));
  const ranked = [...assessed].sort(
    (a, b) =>
      Object.values(b.checks).filter((v) => v === 'present').length -
      Object.values(a.checks).filter((v) => v === 'present').length
  );
  const strongest = ranked.filter(({ pair }) => pair.answer).slice(0, 2);
  const improvements = [...ranked].reverse().slice(0, 2);

  const finish = () => {
    if (!sessionFinishedRef.current) {
      try {
        const result = interview.progress.answered > 0 ? 'completed' : 'failed';
        captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SESSION_FINISHED, { result });
      } catch {}
      sessionFinishedRef.current = true;
    }
    interview.stop();
    onEnd();
  };

  // ── Post-Session Comprehensive Review ─────────────────────────────
  if (interview.isCompleted) {
    return (
      <main className="fixed inset-0 z-[100] overflow-y-auto bg-background" aria-labelledby="report-title">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
          {/* Header */}
          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-border pb-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-control border-primary/40 bg-primary/5 text-primary text-xs font-semibold">
                  Practice complete
                </Badge>
                {difficulty && (
                  <Badge variant="secondary" className="rounded-control text-xs capitalize">
                    {difficulty}
                  </Badge>
                )}
              </div>
              <h2 id="report-title" className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Interview Performance Review
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Target role: <strong>{jobRole}</strong>{industry ? ` · ${industry}` : ''} · Evidence evaluated from this session only
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-control" onClick={finish}>
                Close report
              </Button>
            </div>
          </header>

          {/* Dimension 1: Assessment Rubric & Evidence Breakdown */}
          <section className="rounded-surface border border-border bg-card p-5 sm:p-6 shadow-card" aria-labelledby="rubric-title">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div>
                <h2 id="rubric-title" className="text-base font-semibold text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Assessment Rubric & Signal Verification
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Deterministic checks flag visible signals for relevance, specificity, evidence, and clarity. They are qualitative text checks, not semantic grading or a hiring probability.
                </p>
              </div>
            </div>

            <div className="mt-4 divide-y divide-border-subtle rounded-surface border border-border">
              {assessed.length ? (
                assessed.map(({ pair, checks }, index) => (
                  <article key={`${pair.question}-${index}`} className="p-4 space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-control bg-secondary px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Question {index + 1}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug">{pair.question}</h3>
                    <div className="rounded-surface bg-secondary/40 p-3 text-xs text-foreground">
                      <p className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Your recorded response:</p>
                      <p className="leading-relaxed">{pair.answer || 'No recognised answer is available for this question.'}</p>
                    </div>

                    <dl className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 pt-1">
                      {Object.entries(checks).map(([key, value]) => {
                        const isPresent = value === 'present';
                        return (
                          <div key={key} className="rounded-control border border-border bg-card p-2">
                            <dt className="capitalize text-[11px] text-muted-foreground">{key}</dt>
                            <dd className={`font-semibold text-xs mt-0.5 flex items-center gap-1 ${isPresent ? 'text-success' : 'text-muted-foreground'}`}>
                              {isPresent && <Check className="h-3 w-3" />}
                              {value}
                            </dd>
                          </div>
                        );
                      })}
                    </dl>
                  </article>
                ))
              ) : (
                <p className="p-5 text-xs text-muted-foreground text-center">
                  No question or transcript evidence is available. No assessment has been inferred.
                </p>
              )}
            </div>
          </section>

          {/* Dimension 2 & 3: Strengths and Missing Depth */}
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-surface border border-border bg-card p-5 sm:p-6 shadow-card space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-success" />
                Strongest Moments
              </h2>
              <p className="text-xs text-muted-foreground">
                Answers with clear situation context, actionable contributions, and measurable evidence.
              </p>
              {strongest.length ? (
                <ul className="space-y-3 pt-1">
                  {strongest.map(({ pair }, index) => (
                    <li key={index} className="rounded-surface border border-border bg-secondary/30 p-3 space-y-1.5 text-xs">
                      <span className="font-semibold text-foreground block">{excerpt(pair.question, 90)}</span>
                      <blockquote className="border-l-2 border-success pl-2.5 text-muted-foreground italic leading-relaxed">
                        &ldquo;{excerpt(pair.answer, 160)}&rdquo;
                      </blockquote>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">There is not enough transcript evidence to identify a strongest moment.</p>
              )}
            </section>

            <section className="rounded-surface border border-border bg-card p-5 sm:p-6 shadow-card space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-warning" />
                Missing Depth & High-Priority Improvements
              </h2>
              <p className="text-xs text-muted-foreground">
                Target areas where adding metrics, specific actions, or technical keywords will strengthen your answer.
              </p>
              {improvements.length ? (
                <ul className="space-y-3 pt-1">
                  {improvements.map(({ pair }, index) => (
                    <li key={index} className="rounded-surface border border-border bg-secondary/30 p-3 space-y-1.5 text-xs">
                      <span className="font-semibold text-foreground block">Focus area: {excerpt(pair.question, 90)}</span>
                      <p className="text-muted-foreground leading-relaxed">
                        Evidence reviewed: {excerpt(pair.answer, 140)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No answer evidence is available to prioritise improvements.</p>
              )}
            </section>
          </div>

          {/* Dimension 4: Structured STAR Retry Blueprint */}
          <section className="rounded-surface border border-border bg-card p-5 sm:p-6 shadow-card space-y-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-primary" />
              Structured STAR Retry Blueprint
            </h2>
            <p className="text-xs text-muted-foreground">
              Structure future answers using the STAR method based on your truthful experience:
            </p>
            <ol className="grid gap-2 sm:grid-cols-2 pt-1 text-xs">
              {retryOutline().map((step, index) => (
                <li key={step} className="rounded-surface border border-border bg-secondary/30 p-3 flex items-start gap-2.5">
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-control bg-primary text-[11px] font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span className="text-foreground leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* Model Generated Notes if Available */}
          {modelReport && (
            <section className="rounded-surface border border-info/40 bg-accent/40 p-5 sm:p-6 space-y-3">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-info" />
                Summary
              </h2>
              <p className="text-xs text-muted-foreground">
                Generated qualitative synthesis; review it against your verified transcript above.
              </p>
              <p className="text-xs text-foreground leading-relaxed font-medium bg-card/60 p-3 rounded-surface border border-border">
                {modelReport.assessment || modelReport.overallVerdict}
              </p>
              {modelReport.strengths.length > 0 && (
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-foreground">Identified Strengths:</span>
                  <p className="text-muted-foreground">{modelReport.strengths.join('; ')}</p>
                </div>
              )}
              {modelReport.weaknesses.length > 0 && (
                <div className="text-xs space-y-1">
                  <span className="font-semibold text-foreground">Areas for Growth:</span>
                  <p className="text-muted-foreground">{modelReport.weaknesses.join('; ')}</p>
                </div>
              )}
            </section>
          )}

          {/* Contextual Assistant & Actions */}
          <section className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <ContextualAssistantDrawer
              task="interview.explain_feedback"
              description="Explain this feedback or propose another practice question for the same role. The report evidence is optional and can be removed before sending."
              suggestedPrompt="Explain the highest-priority feedback in plain language and suggest one focused practice question for this role."
              context={[
                { id: 'interview-role', label: jobRole, provenance: 'opportunity', content: jobRole },
                {
                  id: 'interview-report',
                  label: 'Interview report',
                  provenance: 'interview_report',
                  content: evidence.map((item) => `Question: ${item.question}\nAnswer: ${item.answer ?? 'Unavailable'}`).join('\n\n'),
                  optional: true,
                  personal: true,
                },
              ]}
            />

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => {
                  try {
                    captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_RETRIED, { from: 'session' });
                  } catch {}
                  onRetry?.();
                }}
                disabled={!onRetry}
                className="rounded-control text-xs"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Try again with this context
              </Button>
              <Button variant="outline" onClick={finish} className="rounded-control text-xs">
                Return to setup
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  // ── Active Practice Workbench (Question ↓ Response ↓ Feedback ↓ Next) ─
  const currentRoundIndex = Math.min(
    Math.floor((interview.progress.answered / Math.max(1, interview.progress.total)) * STAGES.length),
    STAGES.length - 1
  );
  const isListening = interview.isListening;
  const isSpeaking = interview.isSpeaking;
  const isProcessing = interview.phase === 'processing';
  const isPaused = interview.phase === 'paused';

  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-background" aria-labelledby="session-title">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        {/* Practice Arena Top Header */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                Practice Workbench
              </span>
              {difficulty && (
                <span className="rounded-control bg-secondary px-2 py-0.5 text-[11px] font-medium capitalize text-secondary-foreground">
                  {difficulty}
                </span>
              )}
            </div>
            <h2 id="session-title" className="truncate text-base font-semibold text-foreground sm:text-lg">
              {jobRole} {industry ? `· ${industry}` : ''}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-control text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setConfirmEnd(true)}
            >
              <PhoneOff className="mr-1.5 h-3.5 w-3.5" />
              End interview
            </Button>
          </div>
        </header>

        {/* Stage & Progress Stepper Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 font-medium text-foreground">
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Round: {STAGES[currentRoundIndex] || 'Practice'}</span>
            </div>
            <span className="tabular-nums font-medium">
              Question {Math.min(interview.progress.answered + 1, interview.progress.total)} of {interview.progress.total}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className="h-2 rounded-full"
            aria-label={`Interview progress: ${interview.progress.answered} of ${interview.progress.total} questions answered`}
          />
        </div>

        {/* Main 4-Step Practice Workspace */}
        <div className="my-auto flex flex-1 flex-col justify-center py-6 space-y-5">
          {/* STEP 1: QUESTION STAGE */}
          <section
            aria-labelledby="question-heading"
            className="rounded-surface border border-border bg-card p-5 sm:p-7 shadow-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="rounded-control border-primary/30 bg-primary/5 text-primary text-xs font-semibold">
                  Question {Math.min(interview.progress.answered + 1, interview.progress.total)}
                </Badge>
                {interview.progress.isFollowUp && (
                  <Badge variant="secondary" className="rounded-control text-xs text-warning">
                    Follow-up probe
                  </Badge>
                )}
              </div>

              {isSpeaking && (
                <span className="flex items-center gap-1.5 text-xs text-primary font-medium">
                  <Volume2 className="h-3.5 w-3.5 animate-pulse motion-reduce:animate-none" />
                  Interviewer reading question…
                </span>
              )}
            </div>

            <div>
              <p id="question-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Active Interview Prompt:
              </p>
              <h3
                key={interview.currentQuestion || 'pending'}
                className="interview-question-enter text-lg font-semibold leading-relaxed text-foreground sm:text-xl"
              >
                {interview.currentQuestion || 'Preparing your first interview question…'}
              </h3>
            </div>
          </section>

          {/* STEP 2: RESPONSE STAGE (Active Audio / Mic & Spoken Answer) */}
          <section
            aria-labelledby="response-heading"
            className="rounded-surface border border-border bg-card p-5 sm:p-6 shadow-card space-y-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-subtle pb-3">
              <div className="flex items-center gap-2">
                <span id="response-heading" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Your Response:
                </span>
                {/* State Chip */}
                <div
                  className={cn(
                    'flex items-center gap-1.5 rounded-control px-2.5 py-0.5 text-xs font-semibold transition-colors duration-150',
                    isListening && 'bg-success/15 text-success border border-success/30',
                    isSpeaking && 'bg-primary/15 text-primary border border-primary/30',
                    isProcessing && 'bg-secondary text-foreground border border-border',
                    isPaused && 'bg-warning/15 text-warning border border-warning/30'
                  )}
                  role="status"
                  aria-live="polite"
                >
                  {isListening ? (
                    <>
                      <Mic className="h-3.5 w-3.5 text-success animate-pulse motion-reduce:animate-none" />
                      <span>Listening</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <Volume2 className="h-3.5 w-3.5 text-primary" />
                      <span>Interviewer speaking</span>
                    </>
                  ) : isProcessing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-primary motion-reduce:animate-none" />
                      <span>Processing answer…</span>
                    </>
                  ) : isPaused ? (
                    <>
                      <Pause className="h-3.5 w-3.5 text-warning" />
                      <span>Paused</span>
                    </>
                  ) : (
                    <span>{statusLabel}</span>
                  )}
                </div>
              </div>

              {/* Visual Waveform Indicator when Mic is Active */}
              {isListening && (
                <div className="flex items-center gap-1 motion-reduce:hidden" aria-hidden="true">
                  <span className="h-2.5 w-1 rounded-full bg-success animate-pulse" style={{ animationDelay: '0ms' }} />
                  <span className="h-4 w-1 rounded-full bg-success animate-pulse" style={{ animationDelay: '150ms' }} />
                  <span className="h-5 w-1 rounded-full bg-success animate-pulse" style={{ animationDelay: '300ms' }} />
                  <span className="h-3 w-1 rounded-full bg-success animate-pulse" style={{ animationDelay: '450ms' }} />
                  <span className="h-2 w-1 rounded-full bg-success animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
              )}
            </div>

            {/* Recognized Realtime Speech Card */}
            <div className="min-h-[90px] rounded-surface border border-border bg-secondary/30 p-4 text-sm leading-relaxed">
              {interview.currentTranscript ? (
                <p className="text-foreground italic">
                  &ldquo;{interview.currentTranscript}&rdquo;
                </p>
              ) : isListening ? (
                <p className="text-xs text-muted-foreground italic flex items-center gap-2">
                  <Mic className="h-3.5 w-3.5 text-success" />
                  Speak clearly into your microphone. Your spoken response will appear here in real-time.
                </p>
              ) : isSpeaking ? (
                <p className="text-xs text-muted-foreground">
                  Listen to the interviewer question. The microphone will activate automatically when finished.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Waiting for speech input…</p>
              )}
            </div>

            {/* Warnings and errors */}
            {interview.silenceWarning && (
              <div role="alert" className="flex items-start gap-2 rounded-surface border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>No speech recognized yet. Take your time; the practice session will not advance until you speak.</span>
              </div>
            )}

            {interview.error && (
              <div role="alert" className="flex items-center justify-between rounded-surface border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                <span>{interview.error}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-control text-xs"
                  onClick={() => {
                    try {
                      captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_RETRIED, { from: 'session' });
                    } catch {}
                    interview.retry();
                  }}
                >
                  <RefreshCw className="mr-1.5 h-3 w-3" />
                  Retry
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Real-time Session Transcript Log (Collapsible) */}
        {showTranscript && (
          <section
            ref={transcriptRef}
            className="mb-4 max-h-56 overflow-y-auto rounded-surface border border-border bg-card p-4 space-y-3"
            aria-label="Interview transcript"
          >
            <div className="flex items-center justify-between border-b border-border-subtle pb-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Session Transcript</span>
              <span className="text-[11px] text-muted-foreground">{interview.messages.length} messages</span>
            </div>
            <div className="space-y-3" role="log" aria-live="polite">
              {interview.messages.map((message) => (
                <div key={message.id} className="text-xs space-y-0.5">
                  <p className="font-semibold text-muted-foreground uppercase text-[10px]">
                    {message.role === 'assistant' ? 'Interviewer' : 'You'}
                  </p>
                  <p className="text-foreground leading-relaxed bg-secondary/30 p-2 rounded-control">
                    {message.content}
                  </p>
                </div>
              ))}
              {interview.currentTranscript && (
                <div className="text-xs space-y-0.5">
                  <p className="font-semibold text-success uppercase text-[10px]">Recognition in progress</p>
                  <p className="text-foreground italic bg-secondary/30 p-2 rounded-control">{interview.currentTranscript}</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Practice Workbench Controls Footer */}
        <footer className="border-t border-border pt-4">
          <div className="flex flex-wrap items-center justify-center gap-2.5" role="toolbar" aria-label="Interview controls">
            <Button
              variant="outline"
              size="sm"
              onClick={interview.replayQuestion}
              disabled={!interview.currentQuestion || isProcessing || interview.phase === 'connecting'}
              className="rounded-control text-xs"
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Repeat question
            </Button>

            {isPaused ? (
              <Button size="sm" onClick={interview.resume} className="rounded-control text-xs">
                <Play className="mr-1.5 h-3.5 w-3.5" />
                Resume
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={interview.pause}
                disabled={!isListening && !isSpeaking}
                className="rounded-control text-xs"
              >
                <Pause className="mr-1.5 h-3.5 w-3.5" />
                Pause
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTranscript((value) => !value)}
              aria-expanded={showTranscript}
              className="rounded-control text-xs text-muted-foreground"
            >
              {showTranscript ? <ChevronUp className="mr-1.5 h-3.5 w-3.5" /> : <ChevronDown className="mr-1.5 h-3.5 w-3.5" />}
              {showTranscript ? 'Hide transcript' : 'Show transcript'}
            </Button>
          </div>

          <p className="mt-3 text-center text-[11px] text-muted-foreground">
            Session scope: {interview.progress.total} questions. Answer by speaking naturally. Responses are analyzed to build your practice report.
          </p>
        </footer>
      </div>

      {/* Confirmation to end session */}
      <AlertDialog open={confirmEnd} onOpenChange={setConfirmEnd}>
        <AlertDialogContent className="rounded-overlay shadow-overlay">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-semibold">End this interview?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Responses already accepted by the service remain available for review. Speech that has not been submitted cannot be recovered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-control text-xs">Continue interview</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-control text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={finish}
            >
              End interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
