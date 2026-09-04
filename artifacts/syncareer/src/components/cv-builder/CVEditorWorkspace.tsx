import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Eye,
  FileText,
  GraduationCap,
  Briefcase,
  FolderKanban,
  Users,
  Wrench,
  User,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
  Layers,
  BookOpen,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

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
type WorkspaceNotice = {
  tone: 'info' | 'success';
  title: string;
  description: string;
};

function cvSnapshot(cv: CVData): string {
  return JSON.stringify(cv);
}

function formatSavedTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
  /** Human label for the owned draft receiving saves, e.g. base CV or application CV. */
  saveScopeLabel?: string;
  /** Workspace footer note shown beneath the editor sheet. */
  footerNote?: string;
  /** Optional journey continuation link surfaced beside the footer note. */
  footerAction?: { label: string; to: string };
  onEdit?: () => void;
}

type SectionKey = 'personal' | 'education' | 'experience' | 'projects' | 'activities' | 'skills' | 'references';

/**
 * The professional CV editing surface. `CVBuilder` (base CV) and the
 * application-scoped editor both render this workspace on the Syncareer canvas
 * with document-like sheets, consistent toolbars, clear save states,
 * section expansion/collapse, and contextual inline AI suggestions.
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
  saveScopeLabel = 'primary CV',
  footerNote = 'Ready to apply? Use this CV as your career baseline or tailor copies for specific roles in Opportunities.',
  footerAction = { label: 'Find matching opportunities', to: '/opportunities' },
}: CVEditorWorkspaceProps) {
  const navigate = useNavigate();
  const [cvData, setCVData] = useState<CVData>(initialCv ?? initialCVData);
  const [activeTab, setActiveTab] = useState<SectionKey>('personal');
  const [viewMode, setViewMode] = useState<'focused' | 'document'>('focused');
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    personal: false,
    education: false,
    experience: false,
    projects: false,
    activities: false,
    skills: false,
    references: false,
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showAIAssistance, setShowAIAssistance] = useState(false);
  const [targetAIBulletPath, setTargetAIBulletPath] = useState<string | null>(null);
  const [undoCVData, setUndoCVData] = useState<CVData | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('unsaved');
  const [fieldErrors, setFieldErrors] = useState<CvValidationErrors>({});
  const [lastSavedLabel, setLastSavedLabel] = useState<string | null>(null);
  const [workspaceNotice, setWorkspaceNotice] = useState<WorkspaceNotice | null>(null);
  
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
      setLastSavedLabel(null);
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

  useEffect(() => {
    if (!workspaceNotice) return;
    const timer = window.setTimeout(() => setWorkspaceNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [workspaceNotice]);

  // Warn before the browser discards a meaningful failed/unsaved draft.
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

  const updateReferences = (references: string) => {
    updateDraft((previous) => ({ ...previous, references }));
    markChanged();
  };

  const focusInvalidPersonalField = (field: string) => {
    setActiveTab('personal');
    requestAnimationFrame(() => document.getElementById(field)?.focus());
  };

  const toggleSectionCollapse = (section: SectionKey) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSuggestForBullet = (fieldPath: string, _text: string) => {
    setTargetAIBulletPath(fieldPath);
    setShowAIAssistance(true);
    const section = fieldPath.split('.')[0] as SectionKey;
    if (section) setActiveTab(section);
    setWorkspaceNotice({
      tone: 'info',
      title: 'Context ready',
      description: 'Wording help is focused on the selected bullet and keeps the suggestion grounded in that section.',
    });
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
      const html2pdf = (await import('html2pdf.js')).default;
      const firstName = cvData.personal.firstName.trim();
      const lastName = cvData.personal.lastName.trim();
      const namePart = [firstName, lastName].filter(Boolean).join('_') || 'CV';
      const filename = `${namePart}_Syncareer.pdf`;

      const opt = {
        margin: [10, 10, 10, 10] as [number, number, number, number],
        filename,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('CV downloaded as PDF.');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'success', format: 'pdf' }); } catch { /* never break */ }
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Could not generate PDF. Please try again.');
      try { captureProductEvent(ANALYTICS_EVENTS.CV_EXPORTED, { result: 'failure', format: 'pdf' }); } catch { /* never break */ }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSaveCV = async () => {
    if (saveActionInFlightRef.current) return;
    saveActionInFlightRef.current = true;
    setSaveState('saving');
    setFieldErrors({});

    try {
      const result = await save(cvData);
      if (!result.ok) {
        if (result.category !== 'validation') {
          logCvPersistenceFailure('save', result);
        }
        if (result.category === 'validation' && result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
          const firstField = Object.keys(result.fieldErrors)[0];
          if (firstField) focusInvalidPersonalField(firstField);
        }
        setSaveState('failed');
        setWorkspaceNotice({
          tone: 'info',
          title: 'Save failed',
          description: 'Your draft is still on screen. Review the message and retry when ready.',
        });
        const toastConfig = cvSaveToast(result, { onRetry: () => void handleSaveCV() });
        if (toastConfig.type === 'error') {
          toast.error(toastConfig.message, { action: toastConfig.action });
        }
        return;
      }

      lastPersistedSnapshotRef.current = cvSnapshot(cvData);
      setSaveState('saved');
      setLastSavedLabel(formatSavedTime(new Date()));
      setUndoCVData(null);
      setWorkspaceNotice({
        tone: 'success',
        title: 'Saved',
        description: `Your ${saveScopeLabel} is up to date.`,
      });
      const toastConfig = cvSaveToast(result);
      toast.success(toastConfig.message, postSaveAction ? {
        action: { label: postSaveAction.label, onClick: () => navigate(postSaveAction.to) }
      } : undefined);

      try {
        const authResponse = await supabase.auth.getSession();
        const userId = authResponse?.data?.session?.user?.id;
        if (userId) {
          const meaningful = getMeaningfulSkills(cvData);
          if (meaningful.length > 0) {
            void syncCVSkills(supabase, userId, meaningful);
          }
          if (refreshIntelligence) {
            void supabase.functions.invoke('compute-user-intelligence', { body: {} }).catch((e) => {
              console.warn('[CVEditor] Intelligence refresh failed (non-blocking):', e);
            });
          }
        }
      } catch (postSaveError) {
        console.warn('[CVEditor] Secondary sync failed (non-blocking):', postSaveError);
      }
    } catch (unexpected) {
      const failure = classifySaveError(unexpected);
      logCvPersistenceFailure('save', failure);
      setSaveState('failed');
      setWorkspaceNotice({
        tone: 'info',
        title: 'Save failed',
        description: 'Your draft was not lost. Retry once the connection is stable.',
      });
      const toastConfig = cvSaveToast(failure, { onRetry: () => void handleSaveCV() });
      toast.error(toastConfig.message, { action: toastConfig.action });
    } finally {
      saveActionInFlightRef.current = false;
    }
  };

  const handleAISuggestion = (proposal: CVAIProposal): boolean => {
    const beforeSnapshot = cvDataRef.current;
    let changed = false;

    updateDraft((previous) => {
      const next = JSON.parse(JSON.stringify(previous)) as CVData;
      const parts = proposal.fieldPath.split('.');
      if (parts[0] === 'personal' && parts[1]) {
        const section = next.personal as unknown as Record<string, string>;
        if (section[parts[1]] === proposal.before && proposal.after !== proposal.before) {
          section[parts[1]] = proposal.after;
          changed = true;
        }
      } else if (parts[0] === 'education' && parts[1]) {
        const section = next.education as unknown as Record<string, string>;
        if (section[parts[1]] === proposal.before && proposal.after !== proposal.before) {
          section[parts[1]] = proposal.after;
          changed = true;
        }
      } else if ((parts[0] === 'experience' || parts[0] === 'projects' || parts[0] === 'activities') && parts[1]) {
        const rows = next[parts[0]] as Array<{ id: string; bullets: string[] } & Record<string, unknown>>;
        const row = rows.find((item) => item.id === parts[1]);
        if (row && parts[2] === 'bullets' && parts[3]) {
          const index = Number(parts[3]);
          if (Number.isInteger(index) && row.bullets[index] === proposal.before) {
            row.bullets[index] = proposal.after;
            changed = true;
          }
        }
      }
      return changed ? next : previous;
    });

    if (!changed) {
      toast.error('The source field changed or the proposal was invalid. Nothing was applied.');
      return false;
    }

    setUndoCVData(beforeSnapshot);
    markChanged();
    setWorkspaceNotice({
      tone: 'success',
      title: 'AI change applied',
      description: 'The selected wording update is now in your draft. Save when you want to keep it.',
    });
    toast.success('Assisted wording applied to your draft. Save changes when you are ready.');
    return true;
  };

  const applyUndo = () => {
    if (!undoCVData) return;
    setCVData(undoCVData);
    cvDataRef.current = undoCVData;
    setUndoCVData(null);
    markChanged();
    setWorkspaceNotice({
      tone: 'info',
      title: 'Previous wording restored',
      description: 'The last assisted rewrite was undone. Your draft remains editable.',
    });
    toast.info('Reverted to previous draft state.');
  };

  const sectionsList: Array<{ key: SectionKey; label: string; icon: React.ComponentType<{ className?: string }>; filled: boolean; count?: number; note: string }> = useMemo(() => [
    {
      key: 'personal',
      label: 'Personal details',
      icon: User,
      filled: Object.values(cvData.personal).some(isMeaningfulText),
      note: 'Name, contact and profile links',
    },
    {
      key: 'education',
      label: 'Education & Honors',
      icon: GraduationCap,
      filled: Object.values(cvData.education).some(isMeaningfulText) || cvData.achievements.some(isAchievementMeaningful),
      count: (cvData.education.university ? 1 : 0) + cvData.achievements.length,
      note: 'University record, GPA and awards',
    },
    {
      key: 'experience',
      label: 'Work experience',
      icon: Briefcase,
      filled: cvData.experience.some(isExperienceMeaningful),
      count: cvData.experience.length,
      note: 'Roles, impact and measurable outcomes',
    },
    {
      key: 'projects',
      label: 'Projects & research',
      icon: FolderKanban,
      filled: cvData.projects.some(isProjectMeaningful),
      count: cvData.projects.length,
      note: 'Projects, research and technical delivery',
    },
    {
      key: 'activities',
      label: 'Co-curricular activities',
      icon: Users,
      filled: cvData.activities.some(isActivityMeaningful),
      count: cvData.activities.length,
      note: 'Leadership, volunteering and teamwork',
    },
    {
      key: 'skills',
      label: 'Skills',
      icon: Wrench,
      filled: getMeaningfulSkills(cvData).length > 0,
      count: getMeaningfulSkills(cvData).length,
      note: 'Technical, analytical and collaboration skills',
    },
    {
      key: 'references',
      label: 'References',
      icon: BookOpen,
      filled: Boolean(cvData.references && cvData.references.trim()),
      note: 'Standard references statement',
    },
  ], [cvData]);

  const activeSection = sectionsList.find((section) => section.key === activeTab) ?? sectionsList[0];
  const completedSections = sectionsList.filter((section) => section.filled).length;

  const openSection = (section: SectionKey) => {
    setActiveTab(section);
    if (collapsedSections[section]) {
      setCollapsedSections((previous) => ({ ...previous, [section]: false }));
    }
  };

  // Only the load itself gates the editor. A user with no saved CV yet gets the
  // blank editor, not a permanent skeleton.
  if (loading) {
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
          <Skeleton className="h-12 w-full rounded-surface" />
          <Skeleton className="h-10 w-full rounded-surface" />
          <Skeleton className="h-96 w-full rounded-surface" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-surface" />
          <Skeleton className="h-64 w-full rounded-surface" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`grid grid-cols-1 gap-6 ${leftShelf ? 'xl:grid-cols-[minmax(260px,0.85fr)_minmax(0,2fr)_minmax(300px,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(300px,1fr)]' : 'lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]'}`}>
        {leftShelf && <aside className="min-w-0">{leftShelf}</aside>}

        <div className="min-w-0 space-y-4">
          <h2 className="sr-only">CV sections</h2>
          {contextBanner}

          <div className="sticky top-14 z-20 rounded-surface border border-border bg-card/95 shadow-card backdrop-blur-sm">
            <div className="flex flex-wrap items-start justify-between gap-3 px-3 py-3 sm:px-4">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" aria-hidden="true" />
                  <span className="type-label">CV Editor</span>
                </div>
                <div
                  className={`inline-flex items-center gap-1.5 rounded-control border border-border bg-secondary px-2.5 py-1 text-xs transition-colors duration-150 motion-reduce:transition-none ${saveState === 'saved' ? 'state-saved' : ''}`}
                  role="status"
                  aria-live="polite"
                >
                  {saveState === 'saving' ? (
                    <>
                      <Spinner className="size-3.5 text-primary" />
                      <span className="font-medium text-foreground">Saving…</span>
                    </>
                  ) : saveState === 'saved' ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-success" />
                      <span className="font-medium text-success">Saved</span>
                      {lastSavedLabel && <span className="text-muted-foreground">at {lastSavedLabel}</span>}
                    </>
                  ) : saveState === 'failed' ? (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                      <span className="font-medium text-destructive">Save failed</span>
                    </>
                  ) : (
                    <>
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      <span className="text-muted-foreground">Unsaved edits</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {undoCVData && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={applyUndo}
                    className="rounded-control text-xs"
                    title="Undo the last suggested rewrite"
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Undo rewrite
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setUploadOpen(true)}
                  className="rounded-control text-xs"
                >
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload CV
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="rounded-control text-xs"
                >
                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                  Preview
                </Button>

                <Button
                  size="sm"
                  onClick={() => void handleSaveCV()}
                  disabled={saveState === 'saving' || saveState === 'saved'}
                  className="rounded-control text-xs"
                >
                  {saveState === 'saving' ? (
                    <Spinner className="mr-1.5 size-3.5" />
                  ) : saveState === 'saved' ? (
                    <Check className="mr-1.5 h-3.5 w-3.5 text-success-foreground" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {saveState === 'saving' ? 'Saving…' : saveState === 'saved' ? 'Saved' : 'Save changes'}
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF || strengthResult.completion.percentage === 0}
                  className="rounded-control text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  {isGeneratingPDF ? 'Generating…' : 'PDF'}
                </Button>
              </div>
            </div>
          </div>

          {workspaceNotice && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-surface border px-4 py-3 text-xs ${workspaceNotice.tone === 'success' ? 'border-success/25 bg-success/10' : 'border-primary/20 bg-primary/5'}`}
            >
              <p className={`font-semibold ${workspaceNotice.tone === 'success' ? 'text-success' : 'text-primary'}`}>
                {workspaceNotice.title}
              </p>
              <p className="mt-1 text-muted-foreground">{workspaceNotice.description}</p>
            </div>
          )}

          {Object.keys(fieldErrors).length > 0 && (
            <div role="alert" className="rounded-surface border border-destructive/30 bg-destructive/5 p-4 text-xs space-y-2">
              <p className="font-semibold text-destructive flex items-center gap-1.5">
                <AlertCircle className="h-4 w-4" />
                Please address the following before saving:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-foreground">
                {Object.entries(fieldErrors).map(([field, message]) => (
                  <li key={field}>
                    <button
                      type="button"
                      className="underline font-medium hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      onClick={() => focusInvalidPersonalField(field)}
                    >
                      {message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)]">
            <nav className="surface-content h-fit overflow-hidden" aria-label="CV sections">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div>
                  <p className="type-label text-primary">Document outline</p>
                  <p className="text-sm font-semibold text-foreground">{completedSections} of {sectionsList.length} sections complete</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewMode(prev => prev === 'focused' ? 'document' : 'focused')}
                  className="h-8 rounded-control text-xs text-muted-foreground"
                  title={viewMode === 'focused' ? 'Switch to continuous document view' : 'Switch to focused section view'}
                >
                  <Layers className="mr-1 h-3.5 w-3.5" />
                  {viewMode === 'focused' ? 'All sections' : 'Single section'}
                </Button>
              </div>
              <div role="tablist" aria-label="CV sections" className="divide-y divide-border">
                {sectionsList.map((sec, index) => {
                  const isCurrent = activeTab === sec.key;
                  const Icon = sec.icon;
                  return (
                    <button
                      key={sec.key}
                      role="tab"
                      aria-selected={isCurrent}
                      onClick={() => openSection(sec.key)}
                      className={`interactive flex w-full items-start justify-between gap-3 px-4 py-3 text-left ${isCurrent ? 'is-selected bg-selected' : 'bg-card'}`}
                    >
                      <span className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-control border border-border bg-secondary text-[11px] font-semibold text-secondary-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                            <Icon className="h-3.5 w-3.5 text-primary" />
                            {sec.label}
                          </span>
                          <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">{sec.note}</span>
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {typeof sec.count === 'number' && (
                          <span className="block text-xs font-medium tabular-nums text-foreground">{sec.count}</span>
                        )}
                        <span className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium ${sec.filled ? 'text-success' : 'text-muted-foreground'}`}>
                          {sec.filled && <CheckCircle2 className="h-3.5 w-3.5" />}
                          {sec.filled ? 'Complete' : 'Open'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="overflow-hidden rounded-surface border border-border bg-white shadow-card">
              <div className="border-b border-border bg-card px-4 py-4 sm:px-6">
                <p className="type-label text-primary">{viewMode === 'focused' ? 'Focused section' : 'Continuous document'}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold tracking-tight text-foreground">{activeSection?.label ?? 'CV section'}</h3>
                  {activeSection?.filled && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ready for review
                    </span>
                  )}
                </div>
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{viewMode === 'focused' ? activeSection?.note : 'Expand the sections you need and work down the document in order.'}</p>
              </div>

              <div className="p-4 sm:p-6">
                {viewMode === 'focused' ? (
                  <div>
                    {activeTab === 'personal' && (
                      <CVFormPersonal data={cvData.personal} onChange={updatePersonal} errors={fieldErrors} />
                    )}
                    {activeTab === 'education' && (
                      <CVFormEducation
                        education={cvData.education}
                        achievements={cvData.achievements}
                        onEducationChange={updateEducation}
                        onAchievementsChange={updateAchievements}
                      />
                    )}
                    {activeTab === 'experience' && (
                      <CVFormExperience
                        experience={cvData.experience}
                        onChange={updateExperience}
                        onSuggestBullet={handleSuggestForBullet}
                        selectedFieldPath={targetAIBulletPath}
                      />
                    )}
                    {activeTab === 'projects' && (
                      <CVFormProjects
                        projects={cvData.projects}
                        onChange={updateProjects}
                        onSuggestBullet={handleSuggestForBullet}
                        selectedFieldPath={targetAIBulletPath}
                      />
                    )}
                    {activeTab === 'activities' && (
                      <CVFormActivities
                        activities={cvData.activities}
                        onChange={updateActivities}
                        onSuggestBullet={handleSuggestForBullet}
                        selectedFieldPath={targetAIBulletPath}
                      />
                    )}
                    {activeTab === 'skills' && (
                      <CVFormSkills skills={cvData.skills} onChange={updateSkills} />
                    )}
                    {activeTab === 'references' && (
                      <section className="space-y-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" aria-hidden="true" />
                          <h3 className="text-base font-semibold">References Section</h3>
                        </div>
                        <Label htmlFor="references-text" className="text-xs font-medium">Standard reference statement</Label>
                        <Textarea
                          id="references-text"
                          value={cvData.references}
                          onChange={(e) => updateReferences(e.target.value)}
                          placeholder="Available upon request"
                          className="rounded-input text-sm"
                          rows={3}
                        />
                        <p className="text-xs text-muted-foreground">
                          Standard international practice is to state &ldquo;Available upon request&rdquo; unless the application specifically asks for referee contact details.
                        </p>
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {sectionsList.map((sec) => {
                      const isCollapsed = collapsedSections[sec.key];
                      const Icon = sec.icon;
                      return (
                        <section key={sec.key} className="py-1 first:pt-0 last:pb-0">
                          <header>
                            <button
                              type="button"
                              onClick={() => toggleSectionCollapse(sec.key)}
                              aria-expanded={!isCollapsed}
                              className="flex w-full items-center justify-between px-1 py-3 text-left transition-colors duration-150 hover:bg-secondary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none"
                            >
                              <div className="flex items-center gap-2.5">
                                {isCollapsed ? (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                ) : (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                )}
                                <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                                <h2 className="text-sm font-semibold text-foreground">{sec.label}</h2>
                                {sec.filled && <CheckCircle2 className="h-3.5 w-3.5 text-success" />}
                              </div>
                              <span className="text-xs text-muted-foreground">{isCollapsed ? 'Expand' : 'Collapse'}</span>
                            </button>
                          </header>
                          <div className="cv-section-body" data-collapsed={isCollapsed ? 'true' : 'false'}>
                            <div className="border-t border-border-subtle pt-4">
                              {sec.key === 'personal' && (
                                <CVFormPersonal data={cvData.personal} onChange={updatePersonal} errors={fieldErrors} />
                              )}
                              {sec.key === 'education' && (
                                <CVFormEducation
                                  education={cvData.education}
                                  achievements={cvData.achievements}
                                  onEducationChange={updateEducation}
                                  onAchievementsChange={updateAchievements}
                                />
                              )}
                              {sec.key === 'experience' && (
                                <CVFormExperience
                                  experience={cvData.experience}
                                  onChange={updateExperience}
                                  onSuggestBullet={handleSuggestForBullet}
                                  selectedFieldPath={targetAIBulletPath}
                                />
                              )}
                              {sec.key === 'projects' && (
                                <CVFormProjects
                                  projects={cvData.projects}
                                  onChange={updateProjects}
                                  onSuggestBullet={handleSuggestForBullet}
                                  selectedFieldPath={targetAIBulletPath}
                                />
                              )}
                              {sec.key === 'activities' && (
                                <CVFormActivities
                                  activities={cvData.activities}
                                  onChange={updateActivities}
                                  onSuggestBullet={handleSuggestForBullet}
                                  selectedFieldPath={targetAIBulletPath}
                                />
                              )}
                              {sec.key === 'skills' && (
                                <CVFormSkills skills={cvData.skills} onChange={updateSkills} />
                              )}
                              {sec.key === 'references' && (
                                <div className="space-y-2">
                                  <Label htmlFor="references-text-doc" className="text-xs font-medium">References Statement</Label>
                                  <Textarea
                                    id="references-text-doc"
                                    value={cvData.references}
                                    onChange={(e) => updateReferences(e.target.value)}
                                    placeholder="Available upon request"
                                    className="rounded-input text-sm"
                                    rows={2}
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        </section>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-card px-4 py-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-control bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" aria-hidden="true" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">
                        Draft progress: {completedSections} of {sectionsList.length} sections complete
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {saveState === 'saved'
                          ? `All changes saved to your ${saveScopeLabel}`
                          : saveState === 'unsaved'
                            ? 'Unsaved changes in draft'
                            : saveState === 'saving'
                              ? 'Saving changes…'
                              : 'Save draft to preserve your work'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPreview(true)}
                      className="rounded-control text-xs"
                    >
                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                      View PDF document
                    </Button>
                    <Button
                      size="sm"
                      disabled={saveState === 'saved' || saveState === 'saving'}
                      onClick={() => handleSaveCV()}
                      className="rounded-control text-xs gap-1.5"
                    >
                      {saveState === 'saving' ? (
                        <>
                          <Spinner className="size-3.5" />
                          Saving…
                        </>
                      ) : saveState === 'saved' ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          Saved
                        </>
                      ) : (
                        <>
                          <Save className="h-3.5 w-3.5" />
                          Save draft
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                  <p>{footerNote}</p>
                  {footerAction && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs font-medium text-primary"
                      onClick={() => navigate(footerAction.to)}
                    >
                      {footerAction.label} →
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-16 lg:max-h-[calc(100vh-5rem)] lg:overflow-y-auto">
          <h2 className="sr-only">CV progress and guidance</h2>
          <CVStrengthScore result={strengthResult} />
          {sidebarExtras}

          <div className="rounded-surface border border-border bg-card p-4 space-y-3 shadow-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                <h3 className="type-label">Wording help</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs rounded-control"
                onClick={() => setShowAIAssistance((open) => !open)}
              >
                {showAIAssistance ? 'Hide' : 'Open'}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {assistantOpportunity
                ? `Grounded in requirement context for ${assistantOpportunity.title}.`
                : 'Select an opportunity to get bullet rewrites grounded in the role.'}
            </p>

            {showAIAssistance && (
              <div className="pt-2">
                <CVAIAssistant
                  cvData={cvData}
                  activeSection={activeTab}
                  opportunity={assistantOpportunity ?? null}
                  opportunityLoading={assistantOpportunityLoading}
                  opportunityError={assistantOpportunityError}
                  onSuggestion={handleAISuggestion}
                  onUndo={applyUndo}
                  targetFieldPath={targetAIBulletPath ?? undefined}
                  onClose={() => setShowAIAssistance(false)}
                />
              </div>
            )}
          </div>
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
