import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Check, Mic, Phone } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { InterviewErrorBoundary } from '@/components/interview/InterviewErrorBoundary';
import { VoiceInterviewMode } from '@/components/interview/VoiceInterviewMode';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { useQueryClient } from '@tanstack/react-query';
import {
  ApplicationStageRail,
  DossierHeader,
  DossierSection,
  EvidenceReference,
  EvidenceStamp,
  RecordList,
  RecordRow,
  RecordState,
  WorkingDocument,
} from '@/components/dossier';
import { loadDossierApplication } from '@/features/application-dossier/dossier';
import { listApplicationEvidenceLinks, listApplicationRequirements, listEvidenceItems, listEvidenceSources } from '@/features/evidence/api';
import { buildRequirementThreads } from '@/features/evidence/dossierViewModel';
import { createEvidenceItem } from '@/features/evidence/api';
import { suggestionsFromInterviewAnswers } from '@/features/evidence/suggestions';
import type { EvidenceSuggestion } from '@/features/evidence/suggestions';
import type { EvidenceCategory } from '@/features/evidence/types';
import { classifyMicrophoneError, type DeviceReadiness } from '@/features/interview/setup';
import { SESSION_OPTIONS, type SessionLengthOption } from '@/features/interview/constants';
import { buildJourney, statusLabel } from '@/features/application-tracker/workflow';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type SessionLength = SessionLengthOption['value'];
type Step = 'setup' | 'readiness' | 'interview';

/**
 * Application-context interview preparation at /applications/:applicationId/interview.
 * The setup derives role context from the dossier, shows the requirements and
 * evidence the student already has, and offers completed answers as reviewable
 * evidence suggestions — never saving them automatically.
 */
export default function ApplicationInterview() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const userId = useSupabaseUserId();
  const queryClient = useQueryClient();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [roleTitle, setRoleTitle] = useState('');
  const [organisation, setOrganisation] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [difficulty, setDifficulty] = useState('intermediate');
  const [interviewType, setInterviewType] = useState('mixed');
  const [sessionLength, setSessionLength] = useState<SessionLength>('standard');
  const [resumeText, setResumeText] = useState('');

  const [threads, setThreads] = useState<ReturnType<typeof buildRequirementThreads>>([]);
  const [_evidenceCount, setEvidenceCount] = useState(0);

  const [step, setStep] = useState<Step>('setup');
  const [readiness, setReadiness] = useState<DeviceReadiness>('unchecked');
  const startRequested = useRef(false);
  const [suggestions, setSuggestions] = useState<EvidenceSuggestion[]>([]);
  const [confirmedIds, setConfirmedIds] = useState<string[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const setupEmittedRef = useRef(false);

  useEffect(() => {
    if (!userId || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { application, error } = await loadDossierApplication(supabase, applicationId, userId);
      if (cancelled) return;
      if (error) {
        setLoadError(error.userMessage);
        setLoading(false);
        return;
      }
      if (!application) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const job = application.job;
      setRoleTitle(job?.title ?? application.job_title_snapshot ?? 'Tracked application');
      setOrganisation(job?.company_name || job?.department || application.company_name_snapshot || '');
      setJobDescription(job?.description ?? (job?.skills?.length ? `Role skills: ${job.skills.join(', ')}` : ''));
      setStatusValue(application.status);

      const [requirements, items, sources, links] = await Promise.all([
        listApplicationRequirements(supabase, applicationId),
        listEvidenceItems(supabase),
        listEvidenceSources(supabase),
        listApplicationEvidenceLinks(supabase),
      ]);
      if (cancelled) return;
      if (requirements.ok) {
        setThreads(
          buildRequirementThreads(
            requirements.data,
            links.ok ? links.data : [],
            items.ok ? items.data : [],
            sources.ok ? sources.data : [],
            [],
          ),
        );
      }
      setEvidenceCount(items.ok ? items.data.length : 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, applicationId]);

  useEffect(() => {
    if (setupEmittedRef.current) return;
    setupEmittedRef.current = true;
    try {
      captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_SETUP_OPENED, { entry: 'application' });
    } catch {}
  }, []);

  const journey = useMemo(() => buildJourney(statusValue), [statusValue]);

  const checkReadiness = useCallback(async () => {
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
  }, [readiness]);

  const handleConfirmSuggestion = async (suggestion: EvidenceSuggestion) => {
    setSavingId(suggestion.id);
    const result = await createEvidenceItem(supabase, {
      category: suggestion.category as EvidenceCategory,
      title: suggestion.title,
      summary: suggestion.summary,
    });
    setSavingId(null);
    if (!result.ok) {
      toast.error(result.userMessage);
      return;
    }
    setConfirmedIds((current) => [...current, suggestion.id]);
    toast.success('Saved to your evidence ledger as a draft. Confirm it from the dossier.');
  };

  const handleSessionEnd = () => {
    startRequested.current = false;
    setStep('setup');
    queryClient.invalidateQueries({ queryKey: ['mock_interviews_history'] });
    toast.success('Interview session closed.');
  };

  if (loading) {
    return (
      <PageLayout title="Interview preparation">
        <div aria-busy="true" aria-label="Loading interview preparation" className="space-y-4">
          <div className="h-40 animate-pulse border border-border bg-muted/40 motion-reduce:animate-none rounded-surface" />
        </div>
      </PageLayout>
    );
  }

  if (notFound) {
    return (
      <PageLayout title="Interview preparation">
        <RecordState
          tone="error"
          title="Dossier not found"
          description="This application does not exist or belongs to another account."
          action={<Button variant="outline" className="rounded-control" onClick={() => navigate('/applications')}>Back to applications</Button>}
        />
      </PageLayout>
    );
  }

  if (loadError) {
    return (
      <PageLayout title="Interview preparation">
        <RecordState
          tone="error"
          title="The application could not be loaded"
          description={loadError}
          action={<Button variant="outline" className="rounded-control" onClick={() => navigate(-1)}>Go back</Button>}
        />
      </PageLayout>
    );
  }

  const backTo = `/applications/${encodeURIComponent(applicationId ?? '')}`;

  if (step === 'interview') {
    return (
      <PageLayout title="Interview preparation">
        <div className="max-w-3xl mx-auto">
          <InterviewErrorBoundary onReset={() => setStep('setup')} fallbackTitle="Interview session crashed">
            <VoiceInterviewMode
              jobRole={roleTitle}
              industry={organisation}
              difficulty={difficulty}
              interviewType={interviewType}
              resumeText={resumeText}
              jobDescription={jobDescription}
              sessionLength={sessionLength}
              applicationId={applicationId ?? null}
              autoStart
              onComplete={(pairs) => setSuggestions(suggestionsFromInterviewAnswers(pairs, roleTitle))}
              onRetry={() => {
                try {
                  captureProductEvent(ANALYTICS_EVENTS.INTERVIEW_RETRIED, { from: 'session' });
                } catch {}
                startRequested.current = false;
                setReadiness('unchecked');
                setStep('readiness');
              }}
              onEnd={handleSessionEnd}
            />
          </InterviewErrorBoundary>
        </div>
      </PageLayout>
    );
  }

  const requirementsPanel = (
    <DossierSection index="02" label="Requirements & evidence" title="What you already have">
      {threads.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No requirements recorded yet. Add them to the dossier to see practice prompts here.
        </p>
      ) : (
        <RecordList label="Requirements and evidence for this role">
          {threads.map((thread) => {
            const supported = thread.evidence.filter((entry) => entry.supportStatus === 'supported');
            const hasDraft = thread.evidence.some((entry) => entry.supportStatus === 'draft');
            return (
              <RecordRow
                key={thread.requirement.id}
                title={thread.requirement.label}
                eyebrow={thread.requirement.origin === 'posting_skill' ? 'Posting skill' : 'Manual'}
                detail={
                  supported.length > 0
                    ? `${supported.length} supported piece${supported.length === 1 ? '' : 's'} of evidence attached.`
                    : hasDraft
                      ? 'Evidence linked, but still a draft without a verified source.'
                      : 'No evidence linked yet — practise an answer for this.'
                }
                meta={
                  thread.evidence.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {thread.evidence.map((entry) => (
                        <span key={entry.item.id} className="inline-flex items-center gap-1">
                          <EvidenceReference id={entry.item.id} />
                          <EvidenceStamp status={entry.supportStatus} />
                        </span>
                      ))}
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </RecordList>
      )}
    </DossierSection>
  );

  return (
    <PageLayout
      title="Interview preparation"
      description={`Practise voice interviews tailored to ${roleTitle}.`}
      headerVariant="document"
    >
      {step === 'setup' && (
        <WorkingDocument label="Interview preparation">
          <DossierHeader
            eyebrow="Interview practice workspace"
            title={roleTitle}
            description={[organisation, statusLabel(statusValue)].filter(Boolean).join(' · ')}
            actions={
              <Button variant="ghost" size="sm" className="rounded-control" asChild>
                <Link to={backTo}>
                  <ArrowLeft aria-hidden="true" className="mr-1.5 h-4 w-4" />
                  Back to dossier
                </Link>
              </Button>
            }
          />
          <ApplicationStageRail stages={journey.steps.map((step2) => ({ id: step2.stage, label: step2.label, state: step2.state }))} label="Application stages" />
          <div className="divide-y divide-border">
            <div className="px-4 py-6 sm:px-6">
              <DossierSection index="01" label="Session" title="Configure the practice session">
                <div className="grid max-w-2xl gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="interview-difficulty" className="text-xs font-medium">Seniority level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger id="interview-difficulty" className="rounded-input text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-overlay">
                        <SelectItem value="beginner" className="text-xs">Entry-level / Internship</SelectItem>
                        <SelectItem value="intermediate" className="text-xs">Mid-level (2–5 years)</SelectItem>
                        <SelectItem value="advanced" className="text-xs">Senior level</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="interview-type" className="text-xs font-medium">Interview type</Label>
                    <Select value={interviewType} onValueChange={setInterviewType}>
                      <SelectTrigger id="interview-type" className="rounded-input text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-overlay">
                        <SelectItem value="behavioral" className="text-xs">Behavioral</SelectItem>
                        <SelectItem value="technical" className="text-xs">Technical</SelectItem>
                        <SelectItem value="mixed" className="text-xs">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="mt-4 max-w-2xl space-y-2">
                  <Label id="interview-session-length" className="type-label">Session length</Label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="group" aria-labelledby="interview-session-length">
                    {SESSION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setSessionLength(option.value)}
                        aria-pressed={sessionLength === option.value}
                        className={cn(
                          'flex min-h-11 flex-col items-center gap-1 rounded-surface border p-3 text-center transition-colors duration-150 motion-reduce:transition-none',
                          sessionLength === option.value ? 'border-primary bg-secondary ring-1 ring-primary/20' : 'border-border hover:border-primary/50 bg-card',
                        )}
                      >
                        <span className="text-xs font-semibold text-foreground">{option.label}</span>
                        <span className="text-[11px] text-muted-foreground">{option.description}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 max-w-2xl space-y-1.5">
                  <Label htmlFor="interview-resume" className="text-xs font-medium">Experience summary (optional)</Label>
                  <Textarea
                    id="interview-resume"
                    value={resumeText}
                    onChange={(event) => setResumeText(event.target.value)}
                    rows={2}
                    className="rounded-input text-xs"
                    placeholder="Key experiences the practice should account for. Only what you type is sent."
                  />
                </div>
                <div className="mt-5">
                  <Button
                    className="w-full max-w-sm rounded-control text-xs"
                    onClick={() => {
                      setReadiness('unchecked');
                      setStep('readiness');
                    }}
                    aria-label="Start voice interview session"
                  >
                    <Phone className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
                    Continue to microphone check
                  </Button>
                </div>
              </DossierSection>
            </div>
            <div className="px-4 py-6 sm:px-6">{requirementsPanel}</div>
            {suggestions.length > 0 && (
              <div className="px-4 py-6 sm:px-6">
                <DossierSection
                  index="03"
                  label="From your last session"
                  title="Completed answers as evidence candidates"
                  description="Recognised question/answer pairs from your most recent session. Review and confirm — nothing is saved automatically."
                >
                  <RecordList label="Evidence candidates">
                    {suggestions.map((suggestion) => {
                      const confirmed = confirmedIds.includes(suggestion.id);
                      return (
                        <RecordRow
                          key={suggestion.id}
                          eyebrow={suggestion.category}
                          title={suggestion.title}
                          detail={suggestion.summary}
                          status={
                            confirmed ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                                <Check aria-hidden="true" className="h-3.5 w-3.5" />
                                Saved as draft
                              </span>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-control text-xs"
                                disabled={savingId === suggestion.id}
                                onClick={() => void handleConfirmSuggestion(suggestion)}
                              >
                                {savingId === suggestion.id && <Spinner className="size-3.5 mr-1" />}
                                Save as draft evidence
                              </Button>
                            )
                          }
                        />
                      );
                    })}
                  </RecordList>
                  <p className="mt-3 text-xs text-muted-foreground">
                    Drafts appear in your evidence ledger on the{' '}
                    <Link to={backTo} className="text-primary underline">
                      application dossier
                    </Link>
                    . Confirm them only when they are accurate.
                  </p>
                </DossierSection>
              </div>
            )}
          </div>
        </WorkingDocument>
      )}

      {step === 'readiness' && (
        <div className="mx-auto max-w-xl space-y-5 rounded-surface border border-border bg-card p-6 shadow-card">
          <div>
            <h2 className="text-base font-semibold text-foreground">Check your microphone</h2>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Syncareer uses your microphone to transcribe answers during this practice interview. Camera and
              screen sharing are never requested.
            </p>
          </div>
          <div role="status" className="rounded-surface bg-secondary/50 p-4 text-xs">
            <div className="flex items-center gap-2 font-medium text-foreground">
              <Mic className="h-4 w-4 text-primary" />
              <span>
                {readiness === 'unchecked' && 'Your microphone has not been checked.'}
                {readiness === 'checking' && 'Requesting microphone access…'}
                {readiness === 'ready' && 'Microphone is ready. Audio output uses your browser text-to-speech support.'}
                {readiness === 'denied' && 'Microphone permission was denied. Update browser permissions, then try again.'}
                {readiness === 'missing' && 'No usable microphone or browser media-device support was found.'}
                {readiness === 'failed' && 'The microphone check failed. Close other apps using the device and retry.'}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button variant="outline" className="rounded-control text-xs" onClick={() => setStep('setup')}>Back</Button>
            <Button variant="outline" className="rounded-control text-xs" disabled={readiness === 'checking'} onClick={() => void checkReadiness()}>
              {readiness === 'checking' ? 'Checking…' : readiness === 'ready' ? 'Check again' : 'Check microphone'}
            </Button>
            <Button
              className="rounded-control text-xs"
              disabled={readiness !== 'ready' || startRequested.current}
              onClick={() => {
                if (readiness !== 'ready' || startRequested.current) return;
                startRequested.current = true;
                setStep('interview');
              }}
            >
              Start interview
            </Button>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
