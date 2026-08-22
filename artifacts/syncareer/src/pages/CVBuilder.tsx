import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { PageLayout } from '@/components/layout/PageLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Download,
  Eye,
  Loader2,
  Save,
  Upload,
} from 'lucide-react';

import { toast } from 'sonner';
import { CVFormPersonal } from '@/components/cv-builder/CVFormPersonal';
import { CVFormEducation } from '@/components/cv-builder/CVFormEducation';
import { CVFormExperience } from '@/components/cv-builder/CVFormExperience';
import { CVFormProjects } from '@/components/cv-builder/CVFormProjects';
import { CVFormActivities } from '@/components/cv-builder/CVFormActivities';
import { CVFormSkills } from '@/components/cv-builder/CVFormSkills';
import { CVPreview } from '@/components/cv-builder/CVPreview';
import { CVPreviewDialog } from '@/components/cv-builder/CVPreviewDialog';
import { CVAIAssistant } from '@/components/cv-builder/CVAIAssistant';
import { CVStrengthScore } from '@/components/cv-builder/CVStrengthScore';
import { CVUploadDialog } from '@/components/cv-builder/CVUploadDialog';
import { CVSkillGapPanel } from '@/components/cv-builder/CVSkillGapPanel';
import { useCVStrengthScore } from '@/hooks/useCVStrengthScore';
import { useCVAnalysis } from '@/hooks/useCVAnalysis';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { useCVPersistence } from '@/hooks/useCVPersistence';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { supabase } from '@/integrations/supabase/client';
import AnimatedSection from '@/components/landing/AnimatedSection';
import type { CVData } from '@/features/cv-builder/types';
import type { CVAIProposal } from '@/features/cv-builder/aiProposal';
import { initialCVData } from '@/features/cv-builder/types';
import {
  classifyLoadError,
  classifySaveError,
  cvSaveToast,
  loadPrimaryCV,
  logCvPersistenceFailure,
  syncCVSkills,
  type CvPersistenceFailure,
  type CvValidationErrors,
} from '@/features/cv-builder/persistence';
import {
  getMeaningfulSkills,
  isAchievementMeaningful,
  isActivityMeaningful,
  isExperienceMeaningful,
  isMeaningfulText,
  isProjectMeaningful,
} from '@/features/cv-builder/scoring';
import { RequirementEvidenceActions } from '@/components/learning/RequirementEvidenceActions';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { buildCandidateEvidence, buildOpportunityContext, matchRequirementToEvidence, type OpportunityContext } from '@/features/cv-builder/guidance';
import type { OpportunityJob } from '@/features/opportunities/opportunity';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'failed';

function cvSnapshot(cv: CVData): string {
  return JSON.stringify(cv);
}

const CVBuilder = () => {
  const [cvData, setCVData] = useState<CVData>(initialCVData);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [showAIAssistance, setShowAIAssistance] = useState(false);
  const [dismissedTargetSkills, setDismissedTargetSkills] = useState<string[]>([]);
  const [undoCVData, setUndoCVData] = useState<CVData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingCV, setIsLoadingCV] = useState(true);
  const [loadFailure, setLoadFailure] = useState<CvPersistenceFailure | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('unsaved');
  const [opportunityContext, setOpportunityContext] = useState<OpportunityContext | null>(null);
  const [opportunityContextLoading, setOpportunityContextLoading] = useState(false);
  const [opportunityContextError, setOpportunityContextError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CvValidationErrors>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const cvDataRef = useRef(cvData);
  const lastPersistedSnapshotRef = useRef<string | null>(null);
  const saveActionInFlightRef = useRef(false);
  const cvStartedEmittedRef = useRef(false);
  const meaningfulPreviousRef = useRef<Record<string, boolean>>({});

  const strengthResult = useCVStrengthScore(cvData);
  const feedbackModal = useFeedbackModal('cv_builder');
  const [uploadOpen, setUploadOpen] = useState(false);
  const cvAnalysis = useCVAnalysis();
  const { isSaving, rememberResumeId, save } = useCVPersistence();

  useEffect(() => {
    cvDataRef.current = cvData;
  }, [cvData]);

  const [searchParams] = useSearchParams();
  const targetRole = searchParams.get('targetRole') || searchParams.get('role') || '';
  const targetCompany = searchParams.get('company') || '';
  const applicationId = searchParams.get('application') || '';
  const opportunityId = searchParams.get('opportunity') || searchParams.get('job') || '';
  const targetSkills = useMemo(() => {
    const raw = searchParams.get('skills') || '';
    const focusSkill = searchParams.get('focusSkill')?.trim();
    return Array.from(new Set([...(raw ? raw.split(',').map((skill) => skill.trim()).filter(Boolean) : []), ...(focusSkill ? [focusSkill] : [])]));
  }, [searchParams]);
  const requestedReturnTo = searchParams.get('returnTo') || '';
  const safeReturnTo = requestedReturnTo.startsWith('/opportunities') || requestedReturnTo.startsWith('/applications') ? requestedReturnTo : '';
  const skillGuidance = useMemo(() => {
    const candidateEvidence = buildCandidateEvidence(cvData);
    return (opportunityContext?.requirements ?? [])
      .filter((requirement) => requirement.kind === 'required_skill' || requirement.kind === 'preferred_skill')
      .map((requirement) => ({ requirement, match: matchRequirementToEvidence(requirement, candidateEvidence) }));
  }, [cvData, opportunityContext]);

  useEffect(() => {
    let active = true;
    if (!opportunityId) {
      setOpportunityContext(null);
      setOpportunityContextError(null);
      setOpportunityContextLoading(false);
      return () => { active = false; };
    }
    setOpportunityContextLoading(true);
    setOpportunityContextError(null);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from('job_postings')
          .select('*')
          .eq('id', opportunityId)
          .maybeSingle();
        if (!active) return;
        if (error || !data) {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity could not be loaded. Choose it again before requesting AI wording.');
          return;
        }
        try {
          setOpportunityContext(buildOpportunityContext(data as OpportunityJob));
        } catch {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity does not contain usable role context.');
        }
      } catch {
        if (active) {
          setOpportunityContext(null);
          setOpportunityContextError('The selected opportunity could not be loaded. Choose it again before requesting AI wording.');
        }
      } finally {
        if (active) setOpportunityContextLoading(false);
      }
    })();
    return () => { active = false; };
  }, [opportunityId]);

  // Analytics: cv_started (entry based on query context)
  useEffect(() => {
    if (cvStartedEmittedRef.current) return;
    cvStartedEmittedRef.current = true;
    const entry = applicationId ? 'application' : targetRole || targetCompany || targetSkills.length > 0 ? 'opportunity' : 'navigation';
    try {
      captureProductEvent(ANALYTICS_EVENTS.CV_STARTED, { entry });
    } catch { /* analytics must never break */ }
  }, [applicationId, targetRole, targetCompany, targetSkills]);

  // Analytics: meaningful section completion (emit once per section when becomes meaningful)
  useEffect(() => {
    const current = {
      personal: Object.values(cvData.personal).some(isMeaningfulText),
      education: Object.values(cvData.education).some(isMeaningfulText) || cvData.achievements.some(isAchievementMeaningful),
      experience: cvData.experience.some(isExperienceMeaningful),
      projects: cvData.projects.some(isProjectMeaningful),
      activities: cvData.activities.some(isActivityMeaningful),
      skills: getMeaningfulSkills(cvData).length > 0,
    };
    for (const [section, meaningful] of Object.entries(current)) {
      if (meaningful && !meaningfulPreviousRef.current[section]) {
        try {
          captureProductEvent(ANALYTICS_EVENTS.CV_MEANINGFUL_SECTION_COMPLETED, { section: section as any });
        } catch { /* never break */ }
      }
    }
    meaningfulPreviousRef.current = current;
  }, [cvData]);

  // Analytics: previewed
  useEffect(() => {
    if (!showPreview) return;
    try { captureProductEvent(ANALYTICS_EVENTS.CV_PREVIEWED, {}); } catch {}
  }, [showPreview]);

  const loadSavedCV = useCallback(async () => {
    setIsLoadingCV(true);
    setLoadFailure(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!data.session?.user?.id) throw { code: 'NO_SESSION', message: 'No authenticated session' };

      const loaded = await loadPrimaryCV(supabase, data.session.user.id);
      if (loaded) {
        setCVData(loaded.cv);
        cvDataRef.current = loaded.cv;
        lastPersistedSnapshotRef.current = cvSnapshot(loaded.cv);
        rememberResumeId(loaded.resumeId);
        setSaveState('saved');
      } else {
        setCVData(initialCVData);
        cvDataRef.current = initialCVData;
        lastPersistedSnapshotRef.current = null;
        rememberResumeId(null);
        setSaveState('unsaved');
      }
    } catch (error) {
      const failure = classifyLoadError(error);
      logCvPersistenceFailure('load', failure);
      setLoadFailure(failure);
    } finally {
      setIsLoadingCV(false);
    }
  }, [rememberResumeId]);

  useEffect(() => {
    void loadSavedCV();
  }, [loadSavedCV]);

  // Warn before the browser discards a meaningful failed/unsaved draft. CV
  // content remains in React state after save failures and is never reset.
  useEffect(() => {
    const shouldWarn = (saveState === 'unsaved' || saveState === 'failed')
      && strengthResult.completion.percentage > 0;
    if (!shouldWarn) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [saveState, strengthResult.completion.percentage]);

  const markChanged = () => {
    setSaveState((current) => current === 'saving' ? current : 'unsaved');
  };

  const updateDraft = (updater: (previous: CVData) => CVData) => {
    setCVData((previous) => {
      const next = updater(previous);
      cvDataRef.current = next;
      return next;
    });
  };

  const updatePersonal = (data: Partial<CVData['personal']>) => {
    updateDraft((previous) => ({ ...previous, personal: { ...previous.personal, ...data } }));
    setFieldErrors((previous) => {
      const next = { ...previous };
      if (data.firstName !== undefined) delete next.firstName;
      if (data.lastName !== undefined) delete next.lastName;
      if (data.email !== undefined) delete next.email;
      return next;
    });
    markChanged();
  };

  const updateEducation = (data: Partial<CVData['education']>) => {
    updateDraft((previous) => ({ ...previous, education: { ...previous.education, ...data } }));
    markChanged();
  };

  const updateAchievements = (achievements: CVData['achievements']) => {
    updateDraft((previous) => ({ ...previous, achievements }));
    markChanged();
  };

  const updateExperience = (experience: CVData['experience']) => {
    updateDraft((previous) => ({ ...previous, experience }));
    markChanged();
  };

  const updateProjects = (projects: CVData['projects']) => {
    updateDraft((previous) => ({ ...previous, projects }));
    markChanged();
  };

  const updateActivities = (activities: CVData['activities']) => {
    updateDraft((previous) => ({ ...previous, activities }));
    markChanged();
  };

  const updateSkills = (skills: string[]) => {
    updateDraft((previous) => ({ ...previous, skills }));
    markChanged();
  };

  const focusInvalidPersonalField = (field: string) => {
    setActiveTab('personal');
    requestAnimationFrame(() => document.getElementById(field)?.focus());
  };

  const handleDownloadPDF = async () => {
    if (strengthResult.completion.percentage === 0) {
      toast.error('Add meaningful CV content before exporting a PDF.');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch {}
      return;
    }
    const element = previewRef.current;
    if (!element) {
      toast.error('The PDF renderer is unavailable. Please retry.');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch {}
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const opt = {
        margin: 0,
        filename: `${cvData.personal.firstName}_${cvData.personal.lastName}_CV.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      };

      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set(opt).from(element).save();
      toast.success('CV downloaded.', {
        action: {
          label: 'Share on WhatsApp',
          onClick: () => {
            const message = encodeURIComponent(`I just built my professional CV with Syncareer. Try it: ${window.location.origin}`);
            window.open(`https://wa.me/?text=${message}`, '_blank');
          },
        },
      });
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'success', format: 'pdf' }); } catch {}
      feedbackModal.triggerFeedback();
    } catch (error) {
      console.error('[CV PDF] generation failed', { name: error instanceof Error ? error.name : 'UnknownError' });
      toast.error('Failed to generate PDF');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch {}
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveCV = async () => {
    if (saveActionInFlightRef.current || isSaving) return;
    saveActionInFlightRef.current = true;
    const cv = cvDataRef.current;
    const savedSnapshot = cvSnapshot(cv);
    setSaveState('saving');
    const result = await save(cv);

    if (!result.ok) {
      if (result.category === 'validation') {
        setFieldErrors(result.fieldErrors);
        setActiveTab('personal');
        setSaveState('unsaved');
      } else {
        setSaveState('failed');
      }
      const spec = cvSaveToast(result, { onRetry: () => void handleSaveCV() });
      toast.error(spec.message, spec.action ? { action: spec.action } : undefined);
      try {
        const failure_code = result.category === 'validation' ? 'validation' as const
          : result.category === 'auth-expired' ? 'authentication' as const
          : result.category === 'permission' ? 'conflict' as const
          : result.category === 'network' ? 'network' as const
          : result.category === 'server' ? 'server' as const
          : 'unknown' as const;
        captureProductEvent(ANALYTICS_EVENTS.CV_SAVE_FINISHED, { result: 'failure', failure_code });
      } catch {}
      saveActionInFlightRef.current = false;
      return;
    }

    setFieldErrors({});
    lastPersistedSnapshotRef.current = savedSnapshot;
    const newerChangesExist = cvSnapshot(cvDataRef.current) !== savedSnapshot;
    setSaveState(newerChangesExist ? 'unsaved' : 'saved');

    try { captureProductEvent(ANALYTICS_EVENTS.CV_SAVE_FINISHED, { result: 'success' }); } catch {}

    // These enrichments happen only after the primary row is confirmed. They
    // are best-effort and can never turn a confirmed CV save into a failure.
    const session = await supabase.auth.getSession()
      .then(({ data }) => data.session)
      .catch(() => null);
    if (session?.user?.id) {
      void syncCVSkills(supabase, session.user.id, cv.skills).catch((error) => {
        logCvPersistenceFailure('skills-sync', classifySaveError(error));
      });
      void supabase.functions.invoke('compute-user-intelligence').then(({ error }) => {
        if (error) logCvPersistenceFailure('intelligence-refresh', classifySaveError(error));
      }).catch((error) => {
        logCvPersistenceFailure('intelligence-refresh', classifySaveError(error));
      });
    }

    const spec = cvSaveToast(result);
    toast.success(newerChangesExist ? 'CV saved. Newer edits are still unsaved.' : spec.message, {
      ...(applicationId
        ? {
            action: {
              label: 'Back to application',
              onClick: () => { window.location.href = `/applications?application=${encodeURIComponent(applicationId)}`; },
            },
          }
        : {}),
    });
    saveActionInFlightRef.current = false;
  };

  const handleAISuggestion = (proposal: CVAIProposal): boolean => {
    const parts = proposal.fieldPath.split('.');
    const beforeSnapshot = cvDataRef.current;
    let changed = false;
    updateDraft((previous) => {
      const next = structuredClone(previous);
      if ((parts[0] === 'personal' || parts[0] === 'education') && parts[1] && parts[1] in next[parts[0]]) {
        const section = next[parts[0]] as unknown as Record<string, string>;
        if (section[parts[1]] === proposal.before && proposal.after !== proposal.before) { section[parts[1]] = proposal.after; changed = true; }
      } else if ((parts[0] === 'experience' || parts[0] === 'projects' || parts[0] === 'activities') && parts[1]) {
        const rows = next[parts[0]] as Array<{ id: string; bullets: string[] } & Record<string, unknown>>;
        const row = rows.find((item) => item.id === parts[1]);
        if (row && parts[2] === 'bullets' && parts[3]) {
          const index = Number(parts[3]);
          if (Number.isInteger(index) && row.bullets[index] === proposal.before) { row.bullets[index] = proposal.after; changed = true; }
        }
      }
      return changed ? next : previous;
    });
    if (!changed) { toast.error('The source field changed or the proposal was invalid. Nothing was applied.'); return false; }
    setUndoCVData(beforeSnapshot);
    markChanged();
    toast.success('AI suggestion applied to your draft. Save changes when you are ready.');
    return true;
  };

  return (
    <PageLayout title="CV Builder" description="Create, review, and save your primary CV." breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Build", to: "/build" }, { label: "CV Builder" }]}>
      {isLoadingCV ? (
        <div
          className="grid grid-cols-1 gap-6 lg:grid-cols-3"
          role="status"
          aria-live="polite"
          aria-busy="true"
          aria-label="Loading your saved CV"
        >
          <span className="sr-only">Loading your saved CV</span>
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      ) : loadFailure ? (
        <div className="mx-auto max-w-lg rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center" role="alert">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" aria-hidden />
          <h2 className="text-lg font-semibold">Your saved CV could not be opened</h2>
          <p className="mt-2 text-sm text-muted-foreground">{loadFailure.userMessage}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Editing is paused so an unseen cloud copy cannot be overwritten.
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void loadSavedCV()}>
            Try again
          </Button>
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <AnimatedSection y={20}>
          {targetRole && (
            <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-wide text-primary font-medium">
                    {applicationId ? 'Application tailoring context' : 'Tailoring CV for'}
                  </p>
                  <p className="text-base font-medium text-foreground">
                    {targetRole}{targetCompany ? ` · ${targetCompany}` : ''}
                  </p>
                  {applicationId && (
                    <p className="mt-1 max-w-xl text-xs text-muted-foreground">
                      This opens from your application workspace, but the current database does not link a saved CV version to an application. Saving updates your primary CV only.
                    </p>
                  )}
                </div>
                {(applicationId || safeReturnTo) && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={safeReturnTo || `/applications?application=${encodeURIComponent(applicationId)}`}>{safeReturnTo.startsWith('/opportunities') ? 'Back to opportunity' : 'Back to application'}</Link>
                  </Button>
                )}
              </div>
              {skillGuidance.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {([
                    { title: 'Supported by your evidence', statuses: ['supported'] },
                    { title: 'Possibly supported — confirm', statuses: ['partially_supported', 'unclear'] },
                    { title: 'Required by the role but not yet supported', statuses: ['unsupported'] },
                  ] as const).map((group) => {
                    const items = skillGuidance.filter(({ requirement, match }) => group.statuses.includes(match.status as never) && !dismissedTargetSkills.includes(requirement.text));
                    if (!items.length) return null;
                    return <section key={group.title} className="rounded-lg border bg-card/70 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p><div className="mt-2 space-y-2">{items.map(({ requirement, match }) => <div key={requirement.requirementId}>{match.status === 'supported' ? <p className="text-sm text-success">✓ {requirement.text} — supported by contextual CV/project evidence. Review before relying on it.</p> : <RequirementEvidenceActions surface="cv" requirement={requirement.text} role={targetRole} onAddEvidence={() => { setActiveTab('experience'); toast.info(`Add a truthful experience or project example showing ${requirement.text}. The skill has not been added.`); }} onNotRelevant={() => setDismissedTargetSkills((current) => current.includes(requirement.text) ? current : [...current, requirement.text])} />}</div>)}</div></section>;
                  })}
                </div>
              ) : targetSkills.length > 0 ? <p className="mt-3 text-xs text-muted-foreground">The link names role skills, but the full opportunity record is required before Syncareer classifies evidence.</p> : null}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap gap-2">
              {undoCVData && <Button variant="ghost" onClick={() => { setCVData(undoCVData); cvDataRef.current = undoCVData; setUndoCVData(null); markChanged(); }}>Undo AI change</Button>}
              <Button
                variant="outline"
                onClick={() => setUploadOpen(true)}
                className="rounded-full px-5"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Existing CV
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                className="rounded-full px-5"
              >
                <Eye className="h-4 w-4 mr-2" />
                {showPreview ? 'Hide Preview' : 'Preview'}
              </Button>
              <div className="flex flex-col items-end gap-1">
                <Button
                  variant="outline"
                  onClick={() => void handleSaveCV()}
                  disabled={isSaving || saveState === 'saved'}
                  className="rounded-full px-5"
                >
                  {saveState === 'saving' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : saveState === 'saved' ? (
                    <Check className="h-4 w-4 mr-2 text-success" />
                  ) : saveState === 'failed' ? (
                    <AlertCircle className="h-4 w-4 mr-2 text-destructive" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saveState === 'saving'
                    ? 'Saving…'
                    : saveState === 'saved'
                      ? 'Saved'
                      : saveState === 'failed'
                        ? 'Retry save'
                        : 'Save changes'}
                </Button>
                <span
                  className={`text-[11px] ${saveState === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}
                  role="status"
                  aria-live="polite"
                >
                  {saveState === 'saving'
                    ? 'Saving to your account…'
                    : saveState === 'saved'
                      ? 'All changes saved'
                      : saveState === 'failed'
                        ? 'Save failed — changes retained'
                        : lastPersistedSnapshotRef.current
                          ? 'Unsaved changes'
                          : 'Not saved yet'}
                </span>
              </div>
              <Button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF || strengthResult.completion.percentage === 0}
                className="rounded-full px-5"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
          </AnimatedSection>

          {Object.keys(fieldErrors).length > 0 && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><p className="font-medium">Fix the following before saving:</p><ul className="mt-2 list-disc pl-5 text-sm">{Object.entries(fieldErrors).map(([field, message]) => <li key={field}><button type="button" className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => focusInvalidPersonalField(field)}>{message}</button></li>)}</ul></div>}
          <AnimatedSection delay={0.08} y={20}>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              {([
                {
                  value: 'personal',
                  label: 'Personal',
                  filled: Object.values(cvData.personal).some(isMeaningfulText),
                },
                {
                  value: 'education',
                  label: 'Education',
                  filled: Object.values(cvData.education).some(isMeaningfulText)
                    || cvData.achievements.some(isAchievementMeaningful),
                },
                { value: 'experience', label: 'Experience', filled: cvData.experience.some(isExperienceMeaningful) },
                { value: 'projects', label: 'Projects', filled: cvData.projects.some(isProjectMeaningful) },
                { value: 'activities', label: 'Activities', filled: cvData.activities.some(isActivityMeaningful) },
                { value: 'skills', label: 'Skills', filled: getMeaningfulSkills(cvData).length > 0 },
              ] as const).map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-1 min-w-[80px] gap-1.5">
                  {tab.label}
                  {tab.filled && <CheckCircle2 className="h-3 w-3 text-primary" />}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <CVFormPersonal
                data={cvData.personal}
                onChange={updatePersonal}
                errors={fieldErrors}
              />
            </TabsContent>

            <TabsContent value="education" className="mt-4">
              <CVFormEducation
                education={cvData.education}
                achievements={cvData.achievements}
                onEducationChange={updateEducation}
                onAchievementsChange={updateAchievements}
              />
            </TabsContent>

            <TabsContent value="experience" className="mt-4">
              <CVFormExperience
                experience={cvData.experience}
                onChange={updateExperience}
              />
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <CVFormProjects
                projects={cvData.projects}
                onChange={updateProjects}
              />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <CVFormActivities
                activities={cvData.activities}
                onChange={updateActivities}
              />
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <CVFormSkills
                skills={cvData.skills}
                onChange={updateSkills}
              />
            </TabsContent>
          </Tabs>
          </AnimatedSection>
        </div>

        {/* Sidebar: Score + Skill Gap + AI Assistant */}
        <AnimatedSection delay={0.12} y={20} className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <CVStrengthScore result={strengthResult} />
          {cvAnalysis.result && (
            <CVSkillGapPanel result={cvAnalysis.result} />
          )}
          <Button variant="outline" className="w-full" onClick={() => setShowAIAssistance((open) => !open)}>{showAIAssistance ? 'Close AI assistance' : `AI help for ${activeTab}`}</Button>
          {showAIAssistance && <CVAIAssistant cvData={cvData} activeSection={activeTab} opportunity={opportunityContext} opportunityLoading={opportunityContextLoading} opportunityError={opportunityContextError} onSuggestion={handleAISuggestion} onUndo={() => { if (undoCVData) { setCVData(undoCVData); cvDataRef.current = undoCVData; setUndoCVData(null); markChanged(); } }} />}
        </AnimatedSection>
      </div>
      )}
      <CVPreviewDialog
        open={showPreview}
        data={cvData}
        isGeneratingPDF={isGeneratingPDF}
        onOpenChange={setShowPreview}
        onDownload={handleDownloadPDF}
      />

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />

      {/* CV Upload Dialog */}
      <CVUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        status={cvAnalysis.status}
        error={cvAnalysis.error}
        onAnalyze={cvAnalysis.analyzeFile}
        onApply={() => {
          cvAnalysis.applyToCVData(setCVData);
          markChanged();
        }}
        onReset={cvAnalysis.reset}
      />
      <div className="fixed -left-[10000px] top-0 w-[794px] bg-white" aria-hidden="true">
        <CVPreview ref={previewRef} data={cvData} />
      </div>
    </PageLayout>
  );
};

export default CVBuilder;
