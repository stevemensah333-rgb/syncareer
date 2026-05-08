import { Mic, Phone, PhoneOff, Volume2, VolumeX, Loader2, AlertTriangle, RefreshCw, Trophy, TrendingUp, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { useEffect, useRef } from 'react';

interface VoiceInterviewModeProps {
  jobRole: string;
  industry?: string;
  difficulty?: string;
  interviewType?: string;
  resumeText?: string;
  jobDescription?: string;
  sessionLength?: 'quick' | 'standard' | 'extended';
  onEnd: () => void;
}

const ROUND_LABELS: Record<string, { label: string; color: string }> = {
  intro: { label: 'Intro', color: 'bg-primary/20 text-primary border-primary/30' },
  technical: { label: 'Technical', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30' },
  behavioral: { label: 'Behavioral', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30' },
  situational: { label: 'Scenario', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30' },
  closing: { label: 'Closing', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30' },
  complete: { label: 'Complete', color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
};

interface FinalReport {
  overallScore: number;
  overallVerdict: string;
  readiness: string;
  assessment: string;
  strengths: string[];
  weaknesses: string[];
  priorities: string[];
  nextSteps: string[];
  categoryScores: {
    technical: number | null;
    behavioral: number | null;
    situational: number | null;
    communication: number;
    overall_impression: number;
  };
  interviewerNote?: string;
}

/** Parse the final report text from the completed interview message */
function parseFinalReport(content: string): FinalReport | null {
  try {
    // Extract score
    const scoreMatch = content.match(/Score:\s*(\d+)\/100/);
    const verdictMatch = content.match(/—\s*([^\n]+)/);
    const readinessMatch = content.match(/Readiness:\s*([^\n]+)/);
    const assessmentMatch = content.match(/Readiness:[^\n]*\n\n([\s\S]*?)(?:\n\n|✅)/);
    const strengthsMatch = content.match(/✅ Strengths:\s*([^\n]+)/);
    const weaknessesMatch = content.match(/⚠️ Areas to Improve:\s*([^\n]+)/);
    const nextStepsMatch = content.match(/📋 Next Steps:\s*([^\n]+)/);
    const noteMatch = content.match(/💼 Interviewer's Note:\s*([^\n]+)/);

    if (!scoreMatch) return null;

    return {
      overallScore: parseInt(scoreMatch[1]),
      overallVerdict: verdictMatch ? verdictMatch[1].trim() : 'N/A',
      readiness: readinessMatch ? readinessMatch[1].trim() : 'N/A',
      assessment: assessmentMatch ? assessmentMatch[1].trim() : '',
      strengths: strengthsMatch ? strengthsMatch[1].split(', ').filter(Boolean) : [],
      weaknesses: weaknessesMatch ? weaknessesMatch[1].split(', ').filter(Boolean) : [],
      priorities: [],
      nextSteps: nextStepsMatch ? nextStepsMatch[1].split(', ').filter(Boolean) : [],
      categoryScores: {
        technical: null,
        behavioral: null,
        situational: null,
        communication: 0,
        overall_impression: parseInt(scoreMatch[1]),
      },
      interviewerNote: noteMatch ? noteMatch[1].trim() : undefined,
    };
  } catch {
    return null;
  }
}

function FinalReportCard({ report }: { report: FinalReport }) {
  const scoreColor = report.overallScore >= 70 ? 'text-green-600' : report.overallScore >= 50 ? 'text-amber-600' : 'text-destructive';
  const readinessColor = report.readiness === 'Ready' ? 'bg-green-500/20 text-green-700' :
    report.readiness === 'Almost Ready' ? 'bg-amber-500/20 text-amber-700' : 'bg-muted text-muted-foreground';

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-5 w-5 text-primary" />
          Interview Complete — Final Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score */}
        <div className="flex items-center justify-between">
          <div>
            <p className={`text-3xl font-bold ${scoreColor}`}>{report.overallScore}<span className="text-lg text-muted-foreground">/100</span></p>
            <p className="text-sm text-muted-foreground">{report.overallVerdict}</p>
          </div>
          <Badge className={readinessColor}>{report.readiness}</Badge>
        </div>

        {/* Progress bar */}
        <Progress value={report.overallScore} className="h-2" />

        {/* Assessment */}
        {report.assessment && (
          <p className="text-sm text-foreground leading-relaxed">{report.assessment}</p>
        )}

        {/* Strengths */}
        {report.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {report.strengths.map((s, i) => (
                <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-green-600">{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {report.weaknesses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              Areas to Improve
            </h4>
            <ul className="space-y-1">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="text-xs text-muted-foreground pl-4 relative before:content-[''] before:absolute before:left-1 before:top-1.5 before:w-1.5 before:h-1.5 before:rounded-full before:bg-amber-500">{w}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps */}
        {report.nextSteps.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-2">Next Steps</h4>
            <ol className="space-y-1">
              {report.nextSteps.map((step, i) => (
                <li key={i} className="text-xs text-muted-foreground flex gap-2">
                  <span className="text-primary font-medium shrink-0">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Interviewer Note */}
        {report.interviewerNote && (
          <div className="p-3 bg-muted rounded-md border-l-2 border-primary">
            <p className="text-xs text-muted-foreground italic">"{report.interviewerNote}"</p>
            <p className="text-xs text-primary mt-1">— Interviewer's Note</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function VoiceInterviewMode({
  jobRole,
  industry,
  difficulty,
  interviewType,
  resumeText,
  jobDescription,
  sessionLength = 'standard',
  onEnd,
}: VoiceInterviewModeProps) {
  const {
    phase,
    isActive,
    isLoading,
    isSpeaking,
    isListening,
    isCompleted,
    messages,
    currentTranscript,
    error,
    progress,
    start,
    stop,
    retry,
  } = useVoiceInterview({
    jobRole,
    industry,
    difficulty,
    interviewType,
    resumeContext: resumeText,
    jobDescription,
    sessionLength,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentTranscript]);

  const handleEnd = () => {
    stop();
    onEnd();
  };

  const getStatusInfo = () => {
    switch (phase) {
      case 'connecting':
        return { label: 'Connecting...', icon: Loader2, color: 'bg-yellow-500/20', iconColor: 'text-yellow-500', animate: 'animate-spin' };
      case 'processing':
        return { label: 'Thinking...', icon: Loader2, color: 'bg-yellow-500/20', iconColor: 'text-yellow-500', animate: 'animate-spin' };
      case 'ai_speaking':
        return { label: 'Interviewer speaking...', icon: Volume2, color: 'bg-primary/20', iconColor: 'text-primary', animate: 'animate-pulse' };
      case 'user_speaking':
        return { label: 'Listening to you...', icon: Mic, color: 'bg-green-500/20', iconColor: 'text-green-500', animate: '' };
      case 'completed':
        return { label: 'Interview Complete', icon: Trophy, color: 'bg-primary/20', iconColor: 'text-primary', animate: '' };
      case 'error':
        return { label: 'Error occurred', icon: AlertTriangle, color: 'bg-destructive/20', iconColor: 'text-destructive', animate: '' };
      default:
        return { label: 'Ready', icon: VolumeX, color: 'bg-muted', iconColor: 'text-muted-foreground', animate: '' };
    }
  };

  const status = getStatusInfo();
  const StatusIcon = status.icon;
  const progressPercent = progress.total > 0 ? (progress.answered / progress.total) * 100 : 0;
  const roundInfo = ROUND_LABELS[progress.currentRound] || ROUND_LABELS.intro;

  // Find the final report message (last assistant message when completed)
  const finalReportMessage = isCompleted ? messages.filter(m => m.role === 'assistant').pop() : null;
  const finalReport = finalReportMessage ? parseFinalReport(finalReportMessage.content) : null;

  return (
    <div className="space-y-4" role="region" aria-label="Voice Interview Session">
      {/* Status + Progress Bar */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn("h-12 w-12 rounded-full flex items-center justify-center transition-all", status.color)}
                role="status"
                aria-live="polite"
                aria-label={status.label}
              >
                <StatusIcon className={cn("h-6 w-6", status.iconColor, status.animate)} aria-hidden="true" />
              </div>
              <div>
                <h3 className="font-semibold">{status.label}</h3>
                <p className="text-sm text-muted-foreground">{jobRole}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isActive && (
                <Badge variant="outline" className={cn("text-xs", roundInfo.color)}>
                  {roundInfo.label}
                </Badge>
              )}
              <Badge variant={isActive ? 'default' : 'secondary'} aria-label={`Status: ${isActive ? 'Live' : isCompleted ? 'Completed' : 'Offline'}`}>
                {isCompleted ? 'Done' : isActive ? 'Live' : 'Offline'}
              </Badge>
            </div>
          </div>

          {/* Progress bar */}
          {isActive && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Question {progress.answered} of {progress.total}</span>
                {progress.runningScore > 0 && (
                  <span>Running Score: {progress.runningScore}%</span>
                )}
              </div>
              <Progress value={progressPercent} className="h-2" />
              {progress.isFollowUp && (
                <p className="text-xs text-muted-foreground italic">Follow-up question — probing deeper</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error State */}
      {phase === 'error' && error && (
        <Card className="border-destructive/50 bg-destructive/5" role="alert">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" aria-hidden="true" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">Error</p>
                <p className="text-sm text-muted-foreground">{error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={retry} className="gap-2 shrink-0">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Report Card (shown when interview is complete) */}
      {isCompleted && finalReport && (
        <FinalReportCard report={finalReport} />
      )}

      {/* Transcript (hidden when complete and report is shown) */}
      {!isCompleted && (
        <Card className="h-[400px]">
          <CardHeader className="py-3">
            <CardTitle className="text-base">Conversation</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[320px] px-4" ref={scrollRef}>
              <div className="space-y-4 pb-4" role="log" aria-label="Interview conversation" aria-live="polite">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] rounded-lg px-4 py-2",
                        msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      )}
                      role="article"
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      <span className="text-[10px] opacity-60 mt-1 block" aria-hidden="true">
                        {msg.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                ))}

                {currentTranscript && (
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-lg px-4 py-2 bg-primary/50 border border-dashed">
                      <p className="text-sm text-primary-foreground/80 italic" aria-label="Your speech in progress">
                        {currentTranscript}
                      </p>
                    </div>
                  </div>
                )}

                {messages.length === 0 && phase === 'idle' && (
                  <p className="text-center text-muted-foreground py-8">
                    Click "Start Voice Interview" to begin
                  </p>
                )}

                {messages.length === 0 && phase === 'connecting' && (
                  <p className="text-center text-muted-foreground py-8">
                    Preparing your interview...
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Conversation history when complete (collapsed view) */}
      {isCompleted && (
        <details className="group">
          <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors py-2">
            View full conversation transcript ({messages.length} messages)
          </summary>
          <Card className="mt-2">
            <CardContent className="p-0">
              <ScrollArea className="h-[280px] px-4">
                <div className="space-y-3 py-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                      <div className={cn("max-w-[80%] rounded-lg px-3 py-2 text-xs", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </details>
      )}

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4" role="toolbar" aria-label="Interview controls">
            {phase === 'idle' || phase === 'error' ? (
              <Button
                size="lg"
                onClick={start}
                disabled={isLoading}
                className="gap-2"
                aria-label="Start voice interview"
              >
                <Phone className="h-5 w-5" aria-hidden="true" />
                Start Voice Interview
              </Button>
            ) : isCompleted ? (
              <Button
                size="lg"
                variant="outline"
                onClick={handleEnd}
                className="gap-2"
              >
                Close Session
              </Button>
            ) : (
              <>
                <div className="flex items-center gap-2" aria-hidden="true">
                  <div className={cn(
                    "h-3 w-3 rounded-full",
                    isListening ? "bg-green-500 animate-pulse" :
                    isSpeaking ? "bg-primary animate-pulse" :
                    "bg-muted-foreground"
                  )} />
                  <span className="text-sm text-muted-foreground">
                    {isListening ? 'Mic Active' : isSpeaking ? 'Speaking' : isLoading ? 'Processing' : 'Standby'}
                  </span>
                </div>
                <Button
                  size="lg"
                  variant="destructive"
                  onClick={handleEnd}
                  className="gap-2"
                  aria-label="End interview"
                >
                  <PhoneOff className="h-5 w-5" aria-hidden="true" />
                  End Interview
                </Button>
              </>
            )}
          </div>
          {(phase === 'idle' || phase === 'error') && (
            <p className="text-center text-xs text-muted-foreground mt-4" role="note">
              Microphone access required · Best in Chrome or Edge
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
