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
  FileText,
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

type SaveState = 'saved' | 'unsaved' | 'saving' | 'failed';

function cvSnapshot(cv: CVData): string {
  return JSON.stringify(cv);
}

const CVBuilder = () => {
  const [cvData, setCVData] = useState<CVData>(initialCVData);
  const [activeTab, setActiveTab] = useState('personal');
  const [showPreview, setShowPreview] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isLoadingCV, setIsLoadingCV] = useState(true);
  const [loadFailure, setLoadFailure] = useState<CvPersistenceFailure | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('unsaved');
  const [fieldErrors, setFieldErrors] = useState<CvValidationErrors>({});
  const previewRef = useRef<HTMLDivElement>(null);
  const cvDataRef = useRef(cvData);
  const lastPersistedSnapshotRef = useRef<string | null>(null);
  const saveActionInFlightRef = useRef(false);

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
  const targetSkills = useMemo(() => {
    const raw = searchParams.get('skills') || '';
    return raw ? raw.split(',').map((skill) => skill.trim()).filter(Boolean) : [];
  }, [searchParams]);
  const missingTargetSkills = useMemo(() => {
    if (!targetSkills.length) return [];
    const have = new Set(cvData.skills.map((skill) => skill.toLocaleLowerCase()));
    return targetSkills.filter((skill) => !have.has(skill.toLocaleLowerCase()));
  }, [targetSkills, cvData.skills]);

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

  const handleDownloadPDF = async () => {
    if (!previewRef.current) {
      toast.error('Please preview your CV first');
      setShowPreview(true);
      return;
    }

    setIsGeneratingPDF(true);
    try {
      const element = previewRef.current;
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
      feedbackModal.triggerFeedback();
    } catch (error) {
      console.error('[CV PDF] generation failed', { name: error instanceof Error ? error.name : 'UnknownError' });
      toast.error('Failed to generate PDF');
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
      saveActionInFlightRef.current = false;
      return;
    }

    setFieldErrors({});
    lastPersistedSnapshotRef.current = savedSnapshot;
    const newerChangesExist = cvSnapshot(cvDataRef.current) !== savedSnapshot;
    setSaveState(newerChangesExist ? 'unsaved' : 'saved');

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

  const handleAISuggestion = (section: string, content: string) => {
    if (section === 'skills') {
      const newSkills = content.split(',').map((skill) => skill.trim()).filter(Boolean);
      updateSkills([...cvData.skills, ...newSkills]);
    }
    toast.success('AI suggestion applied.');
  };

  return (
    <PageLayout title="CV Builder" breadcrumbs={[{ label: "Home", to: "/dashboard" }, { label: "Build", to: "/build" }, { label: "CV Builder" }]}>
      {isLoadingCV ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                {applicationId && (
                  <Button size="sm" variant="ghost" asChild>
                    <Link to={`/applications?application=${encodeURIComponent(applicationId)}`}>Back to application</Link>
                  </Button>
                )}
                {targetSkills.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      if (!missingTargetSkills.length) {
                        toast.info('Your CV already lists all highlighted skills.');
                        return;
                      }
                      updateSkills([...cvData.skills, ...missingTargetSkills]);
                      toast.success(`Added ${missingTargetSkills.length} target skill${missingTargetSkills.length > 1 ? 's' : ''} to your CV.`);
                    }}
                  >
                    {missingTargetSkills.length
                      ? `Add ${missingTargetSkills.length} missing skill${missingTargetSkills.length > 1 ? 's' : ''}`
                      : 'All highlighted skills present'}
                  </Button>
                )}
              </div>
              {targetSkills.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {targetSkills.map(s => {
                    const present = cvData.skills.some(c => c.toLowerCase() === s.toLowerCase());
                    return (
                      <span
                        key={s}
                        className={`text-xs px-2 py-0.5 rounded-full border ${present ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}
                      >
                        {present ? '✓ ' : '+ '}{s}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <h2 className="font-serif text-3xl md:text-4xl font-normal tracking-[-0.02em]">
                Build your <span className="italic text-primary">CV</span>
              </h2>
            </div>
            <div className="flex gap-2 flex-wrap">
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
                disabled={isGeneratingPDF}
                className="rounded-full px-5"
              >
                <Download className="h-4 w-4 mr-2" />
                {isGeneratingPDF ? 'Generating...' : 'Download PDF'}
              </Button>
            </div>
          </div>
          </AnimatedSection>

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
        <AnimatedSection delay={0.12} y={20} className="space-y-6">
          <CVStrengthScore result={strengthResult} />
          {cvAnalysis.result && (
            <CVSkillGapPanel result={cvAnalysis.result} />
          )}
          <CVAIAssistant
            cvData={cvData}
            activeSection={activeTab}
            onSuggestion={handleAISuggestion}
          />
        </AnimatedSection>
      </div>
      )}
      {/* CV Preview Modal/Section */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-auto">
          <div className="bg-white max-w-4xl w-full max-h-[90vh] overflow-auto rounded-lg shadow-xl">
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10">
              <h3 className="font-semibold">CV Preview</h3>
              <div className="flex gap-2">
                <Button onClick={handleDownloadPDF} disabled={isGeneratingPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
            </div>
            <div className="p-4">
              <CVPreview ref={previewRef} data={cvData} />
            </div>
          </div>
        </div>
      )}

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
    </PageLayout>
  );
};

export default CVBuilder;
