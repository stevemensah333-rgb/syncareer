import React, { useEffect, useMemo, useRef, useState } from 'react';

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
import { useCVStrengthScore } from '@/hooks/useCVStrengthScore';
import { useCVAnalysis } from '@/hooks/useCVAnalysis';
import { useFeedbackModal } from '@/hooks/useFeedbackModal';
import { FeedbackModal } from '@/components/feedback/FeedbackModal';
import { supabase } from '@/integrations/supabase/client';
import type { CVData } from '@/features/cv-builder/types';
import { initialCVData } from '@/features/cv-builder/types';
import type { CVAIProposal } from '@/features/cv-builder/aiProposal';
import { classifySaveError, cvSaveToast, logCvPersistenceFailure, syncCVSkills, type CvSaveResult, type CvValidationErrors } from '@/features/cv-builder/persistence';
import type { OpportunityContext } from '@/features/cv-builder/guidance';
import {
  getMeaningfulSkills,
  isAchievementMeaningful,
  isActivityMeaningful,
  isExperienceMeaningful,
  isMeaningfulText,
  isProjectMeaningful,
} from '@/features/cv-builder/scoring';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'failed';

function cvSnapshot(cv: CVData): string {
  return JSON.stringify(cv);
}

export interface CVEditorWorkspaceProps {
  /** Load lifecycle. The page owns loading and renders its own failure screen. */
  loading?: boolean;
  /** Initial draft content; changing identity remounts the editor state. */
  initialCv: CVData | null;
  /**
   * Persists the draft. The page decides which owned resume row receives the
   * update; the workspace only surfaces the result.
   */
  save: (cv: CVData) => Promise<CvSaveResult>;
  /** Rendered above the toolbar: tailoring context, warnings, back links. */
  contextBanner?: React.ReactNode;
  /** Rendered as an optional left column (e.g. the evidence shelf). */
  leftShelf?: React.ReactNode;
  /** Rendered in the right sidebar below the strength score. */
  sidebarExtras?: React.ReactNode;
  /** Assistant grounding; omit to disable grounded assistance. */
  assistantOpportunity?: OpportunityContext | null;
  assistantOpportunityLoading?: boolean;
  assistantOpportunityError?: string | null;
  /** Optional toast action after a successful save, e.g. "Back to application". */
  postSaveAction?: { label: string; to: string };
  /**
   * Refresh recommendation intelligence after a confirmed save. The base CV
   * keeps the existing behavior; tailoring saves skip it so application
   * editing never rewrites recommendation state.
   */
  refreshIntelligence?: boolean;
  onEdit?: () => void;
}

/**
 * The shared CV editing surface. `CVBuilder` (base CV) and the
 * application-scoped editor both render this workspace and supply only their
 * persistence target and contextual panels, so save semantics, validation,
 * undo, preview, and PDF export stay identical everywhere.
 */
export function CVEditorWorkspace({
  loading = false,
  initialCv,
  save,
  contextBanner,
  leftShelf,
  sidebarExtras,
  assistantOpportunity,
  assistantOpportunityLoading = false,
  assistantOpportunityError = null,
  postSaveAction,
  refreshIntelligence = true,
}: CVEditorWorkspaceProps) {
  const [cvData, setCVData] = useState<CVData>(initialCv ?? initialCVData);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [showAIAssistance, setShowAIAssistance] = useState(false);
  const [undoCVData, setUndoCVData] = useState<CVData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('unsaved');
  const [fieldErrors, setFieldErrors] = useState<CvValidationErrors>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const cvDataRef = useRef(cvData);
  const lastPersistedSnapshotRef = useRef<string | null>(null);
  const saveActionInFlightRef = useRef(false);
  const meaningfulPreviousRef = useRef<Record<string, boolean>>({});

  const strengthResult = useCVStrengthScore(cvData);
  const feedbackModal = useFeedbackModal('cv_builder');
  const [uploadOpen, setUploadOpen] = useState(false);
  const cvAnalysis = useCVAnalysis();

  useEffect(() => {
    cvDataRef.current = cvData;
  }, [cvData]);

  // Adopt a freshly loaded draft exactly once per identity.
  const initialCvRef = useRef<CVData | null>(null);
  useEffect(() => {
    if (initialCv && initialCv !== initialCvRef.current) {
      initialCvRef.current = initialCv;
      setCVData(initialCv);
      cvDataRef.current = initialCv;
      lastPersistedSnapshotRef.current = cvSnapshot(initialCv);
      setSaveState('saved');
      setFieldErrors({});
      setUndoCVData(null);
    }
  }, [initialCv]);

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
          captureProductEvent(ANALYTICS_EVENTS.CV_MEANINGFUL_SECTION_COMPLETED, { section: section as 'personal' | 'education' | 'experience' | 'projects' | 'activities' | 'skills' });
        } catch { /* never break */ }
      }
    }
    meaningfulPreviousRef.current = current;
  }, [cvData]);

  useEffect(() => {
    if (!showPreview) return;
    try { captureProductEvent(ANALYTICS_EVENTS.CV_PREVIEWED, {}); } catch { /* never break */ }
  }, [showPreview]);

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
    setSaveState((current) => (current === 'saving' ? current : 'unsaved'));
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
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch { /* never break */ }
      return;
    }
    const element = previewRef.current;
    if (!element) {
      toast.error('The PDF renderer is unavailable. Please retry.');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch { /* never break */ }
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
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'success', format: 'pdf' }); } catch { /* never break */ }
      feedbackModal.triggerFeedback();
    } catch (error) {
      console.error('[CV PDF] generation failed', { name: error instanceof Error ? error.name : 'UnknownError' });
      toast.error('Failed to generate PDF');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch { /* never break */ }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveCV = async () => {
    if (saveActionInFlightRef.current) return;
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
      } catch { /* never break */ }
      saveActionInFlightRef.current = false;
      return;
    }

    setFieldErrors({});
    lastPersistedSnapshotRef.current = savedSnapshot;
    const newerChangesExist = cvSnapshot(cvDataRef.current) !== savedSnapshot;
    setSaveState(newerChangesExist ? 'unsaved' : 'saved');

    try { captureProductEvent(ANALYTICS_EVENTS.CV_SAVE_FINISHED, { result: 'success' }); } catch { /* never break */ }

    // Best-effort skill mirroring; it can never turn a confirmed save into a
    // failure. The application-scoped editor intentionally skips the
    // intelligence refresh so tailoring never rewrites recommendation state.
    const session = await supabase.auth.getSession()
      .then(({ data }) => data.session)
      .catch(() => null);
    if (session?.user?.id) {
      void syncCVSkills(supabase, session.user.id, cv.skills).catch((error) => {
        logCvPersistenceFailure('skills-sync', classifySaveError(error));
      });
      if (refreshIntelligence) {
        void supabase.functions.invoke('compute-user-intelligence').then(({ error }) => {
          if (error) logCvPersistenceFailure('intelligence-refresh', classifySaveError(error));
        }).catch((error) => {
          logCvPersistenceFailure('intelligence-refresh', classifySaveError(error));
        });
      }
    }

    const spec = cvSaveToast(result);
    toast.success(newerChangesExist ? 'CV saved. Newer edits are still unsaved.' : spec.message, {
      ...(postSaveAction
        ? { action: { label: postSaveAction.label, onClick: () => { window.location.href = postSaveAction.to; } } }
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
    toast.success('Assisted wording applied to your draft. Save changes when you are ready.');
    return true;
  };

  const applyUndo = () => {
    if (!undoCVData) return;
    setCVData(undoCVData);
    cvDataRef.current = undoCVData;
    setUndoCVData(null);
    markChanged();
  };

  const tabs = useMemo(() => ([
    { value: 'personal', label: 'Personal', filled: Object.values(cvData.personal).some(isMeaningfulText) },
    {
      value: 'education',
      label: 'Education',
      filled: Object.values(cvData.education).some(isMeaningfulText) || cvData.achievements.some(isAchievementMeaningful),
    },
    { value: 'experience', label: 'Experience', filled: cvData.experience.some(isExperienceMeaningful) },
    { value: 'projects', label: 'Projects', filled: cvData.projects.some(isProjectMeaningful) },
    { value: 'activities', label: 'Activities', filled: cvData.activities.some(isActivityMeaningful) },
    { value: 'skills', label: 'Skills', filled: getMeaningfulSkills(cvData).length > 0 },
  ] as const), [cvData]);

  if (loading || !initialCv) {
    return (
      <div
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
        aria-label="Loading your saved CV"
      >
        <span className="sr-only">Loading your saved CV</span>
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 gap-6 ${leftShelf ? 'xl:grid-cols-[minmax(240px,0.8fr)_minmax(0,2fr)_minmax(280px,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(280px,1fr)]' : 'lg:grid-cols-3'}`}>
        {leftShelf && <aside className="min-w-0">{leftShelf}</aside>}
        <div className="min-w-0 space-y-6">
          {contextBanner}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <div className="flex flex-wrap gap-2">
              {undoCVData && <Button variant="ghost" onClick={applyUndo}>Undo assisted change</Button>}
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
                  disabled={saveState === 'saving' || saveState === 'saved'}
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

          {Object.keys(fieldErrors).length > 0 && <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4"><p className="font-medium">Fix the following before saving:</p><ul className="mt-2 list-disc pl-5 text-sm">{Object.entries(fieldErrors).map(([field, message]) => <li key={field}><button type="button" className="rounded-sm underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => focusInvalidPersonalField(field)}>{message}</button></li>)}</ul></div>}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="flex w-full overflow-x-auto">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="min-w-[80px] flex-1 gap-1.5">
                  {tab.label}
                  {tab.filled && <CheckCircle2 className="h-3 w-3 text-primary" />}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="personal" className="mt-4">
              <CVFormPersonal data={cvData.personal} onChange={updatePersonal} errors={fieldErrors} />
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
              <CVFormExperience experience={cvData.experience} onChange={updateExperience} />
            </TabsContent>

            <TabsContent value="projects" className="mt-4">
              <CVFormProjects projects={cvData.projects} onChange={updateProjects} />
            </TabsContent>

            <TabsContent value="activities" className="mt-4">
              <CVFormActivities activities={cvData.activities} onChange={updateActivities} />
            </TabsContent>

            <TabsContent value="skills" className="mt-4">
              <CVFormSkills skills={cvData.skills} onChange={updateSkills} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <CVStrengthScore result={strengthResult} />
          {sidebarExtras}
          <Button variant="outline" className="w-full" onClick={() => setShowAIAssistance((open) => !open)}>{showAIAssistance ? 'Close assistance' : `Draft with assistance — ${activeTab}`}</Button>
          {showAIAssistance && (
            <CVAIAssistant
              cvData={cvData}
              activeSection={activeTab}
              opportunity={assistantOpportunity ?? null}
              opportunityLoading={assistantOpportunityLoading}
              opportunityError={assistantOpportunityError}
              onSuggestion={handleAISuggestion}
              onUndo={applyUndo}
            />
          )}
        </div>
      </div>
      <CVPreviewDialog
        open={showPreview}
        data={cvData}
        isGeneratingPDF={isGeneratingPDF}
        onOpenChange={setShowPreview}
        onDownload={handleDownloadPDF}
      />

      <FeedbackModal
        isOpen={feedbackModal.isOpen}
        onSubmit={feedbackModal.submitFeedback}
        onDismiss={feedbackModal.dismiss}
      />

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
    </>
  );
}
