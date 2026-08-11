import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Headphones, Mic, Pause, PhoneOff, Play, RefreshCw, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { INTERVIEW_PHASE_LABELS } from '@/features/interview/lifecycle';
import { deterministicAnswerChecks, pairQuestionAnswers, retryOutline } from '@/features/interview/sessionReport';
import { parseFinalReport } from '@/features/interview/reportParser';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';

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
  onEnd: () => void;
  onRetry?: () => void;
}

const excerpt = (text: string | null, length = 180) => text ? `${text.slice(0, length)}${text.length > length ? '…' : ''}` : 'Transcript unavailable.';

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
  onEnd,
  onRetry,
}: VoiceInterviewModeProps) {
  const interview = useVoiceInterview({
    jobRole, industry, difficulty, interviewType, resumeContext: resumeText,
    jobDescription, sessionLength, applicationId,
  });
  const [showTranscript, setShowTranscript] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const autoStartedRef = useRef(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoStart || autoStartedRef.current) return;
    autoStartedRef.current = true;
    void interview.start();
  }, [autoStart, interview.start]);

  useEffect(() => {
    if (showTranscript && transcriptRef.current) transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
  }, [interview.messages, interview.currentTranscript, showTranscript]);

  const statusLabel = INTERVIEW_PHASE_LABELS[interview.phase];
  const progressPercent = interview.progress.total > 0 ? (interview.progress.answered / interview.progress.total) * 100 : 0;
  const evidence = useMemo(() => pairQuestionAnswers(interview.messages), [interview.messages]);
  const modelMessage = interview.isCompleted ? interview.messages.findLast((message) => message.role === 'assistant' && /interview complete/i.test(message.content)) : null;
  const modelReport = modelMessage ? parseFinalReport(modelMessage.content) : null;
  const assessed = evidence.map((pair) => ({ pair, checks: deterministicAnswerChecks(pair) }));
  const ranked = [...assessed].sort((a, b) => Object.values(b.checks).filter((v) => v === 'present').length - Object.values(a.checks).filter((v) => v === 'present').length);
  const strongest = ranked.filter(({ pair }) => pair.answer).slice(0, 2);
  const improvements = [...ranked].reverse().slice(0, 2);

  const finish = () => {
    interview.stop();
    onEnd();
  };

  if (interview.isCompleted) {
    return (
      <main className="fixed inset-0 z-[100] overflow-y-auto bg-background" aria-labelledby="report-title">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:py-10">
          <header className="flex flex-wrap items-start justify-between gap-4 border-b pb-5">
            <div><p className="text-sm font-medium text-primary">Practice complete</p><h1 id="report-title" className="text-2xl font-semibold tracking-tight">Interview report</h1><p className="mt-1 text-sm text-muted-foreground">{jobRole} · Evidence from this session only</p></div>
            <Button variant="outline" onClick={finish}>Close report</Button>
          </header>

          <section className="rounded-lg border bg-card p-5" aria-labelledby="rubric-title">
            <h2 id="rubric-title" className="font-semibold">Assessment rubric</h2>
            <p className="mt-1 text-sm text-muted-foreground">Deterministic checks flag visible signals for relevance, specificity, evidence and clarity. They are qualitative text checks, not semantic grading or a hiring probability.</p>
            <div className="mt-4 divide-y rounded-lg border">
              {assessed.length ? assessed.map(({ pair, checks }, index) => (
                <article key={`${pair.question}-${index}`} className="p-4">
                  <p className="text-xs font-medium text-muted-foreground">Question {index + 1}</p>
                  <h3 className="mt-1 font-medium">{pair.question}</h3>
                  <p className="mt-2 text-sm">{pair.answer || 'No recognised answer is available for this question.'}</p>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                    {Object.entries(checks).map(([key, value]) => <div key={key}><dt className="capitalize text-muted-foreground">{key}</dt><dd className="font-medium">{value}</dd></div>)}
                  </dl>
                </article>
              )) : <p className="p-4 text-sm text-muted-foreground">No question or transcript evidence is available. No assessment has been inferred.</p>}
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Strongest moments</h2>{strongest.length ? <ul className="mt-3 space-y-3">{strongest.map(({ pair }, index) => <li key={index} className="text-sm"><span className="font-medium">{excerpt(pair.question, 100)}</span><blockquote className="mt-1 border-l-2 pl-3 text-muted-foreground">“{excerpt(pair.answer)}”</blockquote></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">There is not enough transcript evidence to identify a strongest moment.</p>}</section>
            <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Highest-priority improvements</h2>{improvements.length ? <ul className="mt-3 space-y-3">{improvements.map(({ pair }, index) => <li key={index} className="text-sm"><span className="font-medium">Strengthen: {excerpt(pair.question, 100)}</span><p className="mt-1 text-muted-foreground">Evidence reviewed: {excerpt(pair.answer)}</p></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">No answer evidence is available to prioritise improvements.</p>}</section>
          </div>

          <section className="rounded-lg border bg-card p-5"><h2 className="font-semibold">Structured retry outline</h2><p className="mt-1 text-sm text-muted-foreground">Use your own truthful experience; this outline does not invent an answer.</p><ol className="mt-3 space-y-2 text-sm">{retryOutline().map((step, index) => <li key={step} className="flex gap-2"><span className="font-medium text-primary">{index + 1}.</span>{step}</li>)}</ol></section>

          {modelReport && <section className="rounded-lg border border-info/40 bg-accent p-5"><h2 className="font-semibold">Model judgment</h2><p className="mt-1 text-xs text-muted-foreground">Generated interpretation; review it against the transcript above. Numeric precision and hiring likelihood are intentionally not shown.</p><p className="mt-3 text-sm">{modelReport.assessment || modelReport.overallVerdict}</p>{modelReport.strengths.length > 0 && <p className="mt-2 text-sm"><span className="font-medium">Model-noted strengths:</span> {modelReport.strengths.join('; ')}</p>}{modelReport.weaknesses.length > 0 && <p className="mt-2 text-sm"><span className="font-medium">Model-noted improvements:</span> {modelReport.weaknesses.join('; ')}</p>}</section>}

          <section className="flex justify-end"><ContextualAssistantDrawer task="interview.explain_feedback" description="Explain this feedback or propose another practice question for the same role. The report evidence is optional and can be removed before sending." suggestedPrompt="Explain the highest-priority feedback in plain language and suggest one focused practice question for this role." context={[{ id: 'interview-role', label: jobRole, provenance: 'opportunity', content: jobRole }, { id: 'interview-report', label: 'Interview report', provenance: 'interview_report', content: evidence.map((item) => `Question: ${item.question}\nAnswer: ${item.answer ?? 'Unavailable'}`).join('\n\n'), optional: true, personal: true }]} /></section>

          <div className="flex flex-wrap gap-3"><Button onClick={() => onRetry?.()} disabled={!onRetry}><RotateCcw className="mr-2 h-4 w-4" />Try again with this context</Button><Button variant="outline" onClick={finish}>Return to setup</Button></div>
        </div>
      </main>
    );
  }

  const animatedState = interview.isSpeaking || interview.isListening || interview.phase === 'processing';
  return (
    <main className="fixed inset-0 z-[100] overflow-y-auto bg-background" aria-labelledby="session-title">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-4 py-4 sm:px-6 sm:py-6">
        <header className="flex items-center justify-between gap-4 border-b pb-4">
          <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Active interview</p><h1 id="session-title" className="truncate text-lg font-semibold">{jobRole}</h1></div>
          <Button variant="outline" className="shrink-0 text-destructive" onClick={() => setConfirmEnd(true)}><PhoneOff className="mr-2 h-4 w-4" />End interview</Button>
        </header>

        <div className="mt-4 flex items-center gap-3"><Progress value={progressPercent} className="h-2 flex-1" /><span className="text-sm tabular-nums text-muted-foreground">Question {Math.min(interview.progress.answered + 1, interview.progress.total)} of {interview.progress.total}</span></div>

        <section className="flex flex-1 flex-col items-center justify-center py-8 text-center">
          <div className={cn('grid h-32 w-32 place-items-center rounded-full border-4 border-primary/30 bg-primary/5 transition-colors duration-150', interview.isListening && 'border-success bg-success/10', interview.isSpeaking && 'border-primary bg-primary/10', interview.phase === 'processing' && 'border-primary/60', animatedState && 'motion-safe:animate-pulse motion-reduce:animate-none')} aria-hidden="true">
            {interview.isListening ? <Mic className="h-10 w-10 text-success" /> : interview.isSpeaking ? <Volume2 className="h-10 w-10 text-primary" /> : <Headphones className="h-10 w-10 text-primary" />}
          </div>
          <div className="mt-5" role="status" aria-live="polite"><p className="font-semibold">{statusLabel}</p><p className="mt-1 text-sm text-muted-foreground">{interview.phase === 'reconnecting' ? 'The connection was interrupted. We are restoring listening without submitting another answer.' : interview.phase === 'paused' ? 'Audio playback and microphone capture are stopped.' : interview.isListening ? 'Your microphone is active. Your answer is submitted only after recognised speech ends.' : interview.isSpeaking ? 'The interviewer is reading the current question.' : interview.phase === 'processing' ? 'Your recognised answer is being reviewed.' : 'Preparing the session.'}</p></div>
          {interview.currentQuestion && <div className="mt-8 max-w-3xl"><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current question</p><p className="mt-2 text-xl font-medium leading-relaxed sm:text-2xl">{interview.currentQuestion}</p></div>}
          {interview.silenceWarning && <div role="alert" className="mt-5 flex max-w-xl items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-left text-sm"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" /><span>No speech has been recognised yet. Take your time; the interview will not advance until a recognised answer is available.</span></div>}
          {interview.error && <div role="alert" className="mt-5 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{interview.error} <Button size="sm" variant="outline" className="ml-2" onClick={interview.retry}><RefreshCw className="mr-2 h-3 w-3" />Retry</Button></div>}
        </section>

        {showTranscript && <section ref={transcriptRef} className="mb-4 max-h-56 overflow-y-auto rounded-lg border bg-card p-4" aria-label="Interview transcript"><div className="space-y-3" role="log" aria-live="polite">{interview.messages.map((message) => <div key={message.id}><p className="text-xs font-medium text-muted-foreground">{message.role === 'assistant' ? 'Interviewer' : 'You'}</p><p className="text-sm">{message.content}</p></div>)}{interview.currentTranscript && <div><p className="text-xs font-medium text-muted-foreground">Recognition in progress</p><p className="text-sm italic">{interview.currentTranscript}</p></div>}</div></section>}

        <footer className="border-t pt-4"><div className="flex flex-wrap items-center justify-center gap-2" role="toolbar" aria-label="Interview controls"><Button variant="outline" onClick={interview.replayQuestion} disabled={!interview.currentQuestion || interview.phase === 'processing' || interview.phase === 'connecting'}><RotateCcw className="mr-2 h-4 w-4" />Repeat question</Button>{interview.phase === 'paused' ? <Button onClick={interview.resume}><Play className="mr-2 h-4 w-4" />Resume</Button> : <Button variant="outline" onClick={interview.pause} disabled={!interview.isListening && !interview.isSpeaking}><Pause className="mr-2 h-4 w-4" />Pause</Button>}<Button variant="ghost" onClick={() => setShowTranscript((value) => !value)} aria-expanded={showTranscript}>{showTranscript ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}{showTranscript ? 'Hide transcript' : 'Show transcript'}</Button></div><p className="mt-3 text-center text-xs text-muted-foreground">Session scope: {interview.progress.total} questions. Ending early preserves only responses already accepted by the service; an unsent local transcript cannot be recovered.</p></footer>
      </div>

      {confirmEnd && <div className="fixed inset-0 z-[110] grid place-items-center bg-foreground/40 p-4" role="dialog" aria-modal="true" aria-labelledby="end-title"><div className="w-full max-w-md rounded-lg border bg-background p-5 shadow-lg"><h2 id="end-title" className="font-semibold">End this interview?</h2><p className="mt-2 text-sm text-muted-foreground">Responses already accepted by the service remain available. Speech that has not been submitted cannot be recovered.</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={() => setConfirmEnd(false)}>Continue interview</Button><Button variant="destructive" onClick={finish}>End interview</Button></div></div></div>}
    </main>
  );
}
