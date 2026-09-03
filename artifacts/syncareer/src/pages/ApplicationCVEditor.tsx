import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { CVEditorWorkspace } from '@/components/cv-builder/CVEditorWorkspace';
import { CVEvidenceShelf } from '@/components/cv-builder/CVEvidenceShelf';
import {
  EvidenceReference,
  DossierSection,
  RecordList,
  RecordRow,
  RecordState,
  WorkingDocument,
} from '@/components/dossier';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import type { CVData } from '@/features/cv-builder/types';
import { initialCVData } from '@/features/cv-builder/types';
import { loadCvRow, saveCvRow } from '@/features/cv-builder/persistence';
import { loadDossierApplication, type DossierLoadError } from '@/features/application-dossier/dossier';
import {
  createApplicationCv,
  listApplicationEvidenceLinks,
  listApplicationRequirements,
  listEvidenceItems,
  listEvidenceSources,
  listResumeEvidenceLinks,
  linkEvidenceToResumeEntry,
  unlinkEvidenceFromResumeEntry,
} from '@/features/evidence/api';
import { buildRequirementThreads } from '@/features/evidence/dossierViewModel';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  ResumeEvidenceLinkRow,
} from '@/features/evidence/types';
import type { WorkspaceApplication, WorkspaceResume } from '@/features/application-tracker/workspace';
import { buildOpportunityContext } from '@/features/cv-builder/guidance';
import type { OpportunityJob } from '@/features/opportunities/opportunity';

/**
 * Application-specific CV Evidence Editor at /applications/:applicationId/cv.
 * It edits the application's own CV copy (created explicitly through
 * `create_application_cv`) and never the primary CV.
 */
export default function ApplicationCVEditor() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const userId = useSupabaseUserId();

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [application, setApplication] = useState<WorkspaceApplication | null>(null);
  const [resumes, setResumes] = useState<WorkspaceResume[]>([]);
  const [initialCv, setInitialCv] = useState<CVData | null>(null);
  const [cvMissing, setCvMissing] = useState(false);

  const [evidenceItems, setEvidenceItems] = useState<EvidenceItemRow[]>([]);
  const [evidenceSources, setEvidenceSources] = useState<EvidenceSourceRow[]>([]);
  const [requirements, setRequirements] = useState<ApplicationRequirementRow[]>([]);
  const [evidenceLinks, setEvidenceLinks] = useState<ApplicationEvidenceLinkRow[]>([]);
  const [resumeLinks, setResumeLinks] = useState<ResumeEvidenceLinkRow[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [resumesError, setResumesError] = useState<DossierLoadError | null>(null);

  const [creationSourceId, setCreationSourceId] = useState('');
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [shelfBusy, setShelfBusy] = useState(false);
  const [shelfMessage, setShelfMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setPageError(null);
    setCreationError(null);
    (async () => {
      const { application: row, error } = await loadDossierApplication(supabase, applicationId, userId);
      if (cancelled) return;
      if (error) {
        setPageError(error.userMessage);
        setLoading(false);
        return;
      }
      if (!row) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setApplication(row);

      const [resumesResult, items, sources, requirementsResult, links, usageLinks] = await Promise.all([
        supabase
          .from('resumes')
          .select('id, user_id, title, updated_at')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false }),
        listEvidenceItems(supabase),
        listEvidenceSources(supabase),
        listApplicationRequirements(supabase, applicationId),
        listApplicationEvidenceLinks(supabase),
        listResumeEvidenceLinks(supabase),
      ]);
      if (cancelled) return;

      if (resumesResult.error) {
        setResumes([]);
        setResumesError({ ok: false, category: 'server', code: null, userMessage: 'CV choices could not be loaded.' });
      } else {
        setResumes(((resumesResult.data ?? []) as WorkspaceResume[]).filter((resume) => resume.user_id === userId));
        setResumesError(null);
      }

      if (items.ok) setEvidenceItems(items.data);
      if (sources.ok) setEvidenceSources(sources.data);
      if (requirementsResult.ok) setRequirements(requirementsResult.data);
      if (links.ok) setEvidenceLinks(links.data);
      if (usageLinks.ok) setResumeLinks(usageLinks.data);
      const failure = [items, sources, requirementsResult, links, usageLinks].find((result) => !result.ok);
      setEvidenceError(failure && !failure.ok ? failure.userMessage : null);

      if (row.resume_id) {
        try {
          const loaded = await loadCvRow(supabase, userId, row.resume_id);
          if (cancelled) return;
          if (loaded) {
            setInitialCv(loaded.cv);
            setCvMissing(false);
          } else {
            setInitialCv(null);
            setCvMissing(true);
          }
        } catch (loadError) {
          if (cancelled) return;
          setInitialCv(null);
          setCvMissing(true);
          console.warn('[application-cv] linked CV could not be loaded', {
            category: (loadError as { code?: string }).code ?? 'unknown',
          });
        }
      } else {
        setInitialCv(null);
        setCvMissing(false);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, applicationId, reloadKey]);

  const handleCreateCv = async () => {
    if (!applicationId || !userId || !creationSourceId) return;
    setCreating(true);
    setCreationError(null);
    const result = await createApplicationCv(supabase, applicationId, creationSourceId);
    setCreating(false);
    if (!result.ok) {
      setCreationError(result.userMessage);
      return;
    }
    setReloadKey((value) => value + 1);
  };

  const handleSave = useCallback(
    async (cv: CVData) => {
      if (!application?.resume_id || !userId) {
        return {
          ok: false as const,
          category: 'server' as const,
          code: 'NO_APPLICATION_CV',
          userMessage: 'No application CV is linked yet. Create it before saving.',
        };
      }
      return saveCvRow(supabase, userId, application.resume_id, cv);
    },
    [application?.resume_id, userId],
  );

  const handleAttach = useCallback(
    async (input: { evidenceId: string; cvSection: ResumeEvidenceLinkRow['cv_section']; entryLocator: string }): Promise<string | null> => {
      if (!application?.resume_id || !userId) return 'Create the application CV first.';
      setShelfBusy(true);
      const result = await linkEvidenceToResumeEntry(supabase, {
        resumeId: application.resume_id,
        evidenceId: input.evidenceId,
        cvSection: input.cvSection,
        entryLocator: input.entryLocator,
      });
      setShelfBusy(false);
      if (!result.ok) return result.userMessage;
      setResumeLinks((current) => (current.some((link) => link.id === result.data.id) ? current : [...current, result.data]));
      return null;
    },
    [application?.resume_id, userId],
  );

  const handleDetach = useCallback(
    async (input: { evidenceId: string; cvSection: ResumeEvidenceLinkRow['cv_section']; entryLocator: string }): Promise<boolean> => {
      if (!application?.resume_id || !userId) return false;
      setShelfBusy(true);
      const result = await unlinkEvidenceFromResumeEntry(supabase, {
        resumeId: application.resume_id,
        evidenceId: input.evidenceId,
        cvSection: input.cvSection,
        entryLocator: input.entryLocator,
      });
      setShelfBusy(false);
      if (!result.ok) {
        setShelfMessage(result.userMessage);
        return false;
      }
      setShelfMessage(null);
      setResumeLinks((current) => current.filter((link) => link.id !== result.data.id));
      return true;
    },
    [application?.resume_id, userId],
  );

  const threads = useMemo(
    () => buildRequirementThreads(requirements, evidenceLinks, evidenceItems, evidenceSources, resumeLinks),
    [requirements, evidenceLinks, evidenceItems, evidenceSources, resumeLinks],
  );

  const assistantOpportunity = useMemo(() => {
    if (!application?.job) return undefined;
    try {
      return buildOpportunityContext(application.job as unknown as OpportunityJob);
    } catch {
      return undefined;
    }
  }, [application?.job]);

  const roleTitle = application?.job?.title ?? application?.job_title_snapshot ?? 'Tracked application';

  if (loading) {
    return (
      <PageLayout title="Application CV" description="Loading the application CV." headerVariant="document">
        <div aria-busy="true" aria-label="Loading application CV" className="space-y-4">
          <div className="h-40 animate-pulse border border-border bg-muted/40 motion-reduce:animate-none rounded-surface" />
        </div>
      </PageLayout>
    );
  }

  if (notFound) {
    return (
      <PageLayout title="Application CV" headerVariant="document">
        <RecordState
          tone="error"
          title="Dossier not found"
          description="This application does not exist or belongs to another account."
          action={
            <Button variant="outline" className="rounded-control" onClick={() => navigate('/applications')}>
              Back to applications
            </Button>
          }
        />
      </PageLayout>
    );
  }

  if (pageError || !application) {
    return (
      <PageLayout title="Application CV" headerVariant="document">
        <RecordState
          tone="error"
          title="The application could not be loaded"
          description={pageError ?? 'Retry to load this application.'}
          action={
            <Button variant="outline" className="rounded-control" onClick={() => setReloadKey((value) => value + 1)}>
              Try again
            </Button>
          }
        />
      </PageLayout>
    );
  }

  const backTo = `/applications/${encodeURIComponent(applicationId ?? '')}`;

  const contextBanner = (
    <div className="rounded-surface border border-primary/25 bg-primary/5 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Application tailoring context</p>
          <p className="mt-0.5 text-base font-semibold text-foreground">{roleTitle}</p>
          <p className="mt-1 max-w-xl text-xs text-muted-foreground leading-relaxed">
            This is the application&rsquo;s own CV copy. Saving changes only this copy; the base CV stays untouched.
          </p>
        </div>
        <Button size="sm" variant="outline" className="rounded-control text-xs" asChild>
          <Link to={backTo}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to dossier
          </Link>
        </Button>
      </div>
    </div>
  );

  const requirementsInspector = (
    <DossierSection title="Role requirements" label="Inspector">
      {threads.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No requirements recorded. Add or import them from the dossier to see coverage here.
        </p>
      ) : (
        <RecordList label="Requirement coverage">
          {threads.map((thread) => {
            const supported = thread.evidence.filter((entry) => entry.supportStatus === 'supported').length;
            return (
              <RecordRow
                key={thread.requirement.id}
                title={thread.requirement.label}
                eyebrow={thread.requirement.origin === 'posting_skill' ? 'Posting skill' : 'Manual'}
                detail={
                  supported > 0
                    ? `${supported} of ${thread.evidence.length} linked records are supported.`
                    : thread.evidence.length > 0
                      ? 'Linked evidence still needs a source.'
                      : 'No evidence linked yet.'
                }
                meta={
                  thread.evidence.length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {thread.evidence.map((entry) => (
                        <EvidenceReference key={entry.item.id} id={entry.item.id} />
                      ))}
                    </span>
                  ) : undefined
                }
              />
            );
          })}
        </RecordList>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Link evidence to requirements from the{' '}
        <Link to={backTo} className="text-primary underline">
          application dossier
        </Link>
        .
      </p>
    </DossierSection>
  );

  if (!application.resume_id) {
    return (
      <PageLayout title="Application CV" description="Create this application's own CV copy." headerVariant="document">
        <WorkingDocument label="Application CV creation">
          <div className="space-y-5 p-4 sm:p-6">
            {cvMissing && (
              <RecordState
                tone="warning"
                title="The linked application CV is unavailable"
                description="The saved copy this application pointed to can no longer be loaded. Create a new application CV from a base CV below."
              />
            )}
            <div className="space-y-2">
              <p className="dossier-eyebrow">Source CV</p>
              <p className="max-w-xl text-sm text-muted-foreground">
                Choose one of your saved CVs to copy. Every field is copied into an independent, application-scoped
                CV; the original stays unchanged and other applications keep their own copies.
              </p>
              {resumesError ? (
                <RecordState tone="warning" title="CV choices could not be loaded" description={resumesError.userMessage} />
              ) : (
                <Select value={creationSourceId} onValueChange={setCreationSourceId}>
                  <SelectTrigger aria-label="Source CV" className="max-w-sm rounded-input">
                    <SelectValue placeholder="Choose a CV to copy" />
                  </SelectTrigger>
                  <SelectContent className="rounded-overlay">
                    {resumes.map((resume) => (
                      <SelectItem key={resume.id} value={resume.id}>
                        {resume.title || 'Untitled CV'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!resumesError && resumes.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You have no saved CV yet.{' '}
                  <Link to="/cv-builder" className="text-primary underline">
                    Create your base CV first.
                  </Link>
                </p>
              )}
            </div>
            {creationError && (
              <RecordState tone="error" title="The application CV could not be created" description={creationError} />
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button disabled={creating || !creationSourceId} onClick={() => void handleCreateCv()} className="rounded-control">
                {creating && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
                Create application CV
              </Button>
              <Button variant="outline" className="rounded-control" asChild>
                <Link to={backTo}>Back to dossier</Link>
              </Button>
            </div>
            {evidenceError && (
              <RecordState
                tone="warning"
                title="Evidence records are temporarily unavailable"
                description={evidenceError}
                action={
                  <Button size="sm" variant="outline" className="rounded-control" onClick={() => setReloadKey((value) => value + 1)}>
                    Retry
                  </Button>
                }
              />
            )}
          </div>
        </WorkingDocument>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Application CV" description={`Tailored CV for ${roleTitle}.`} headerVariant="document">
      {evidenceError && (
        <RecordState
          tone="warning"
          title="Evidence records are temporarily unavailable"
          description={evidenceError}
          action={
            <Button size="sm" variant="outline" className="rounded-control" onClick={() => setReloadKey((value) => value + 1)}>
              Retry
            </Button>
          }
          className="mb-4"
        />
      )}
      {shelfMessage && (
        <RecordState tone="warning" title="That change did not save" description={shelfMessage} className="mb-4" />
      )}
      <CVEditorWorkspace
        loading={false}
        initialCv={initialCv ?? initialCVData}
        save={handleSave}
        contextBanner={contextBanner}
        leftShelf={
          <CVEvidenceShelf
            items={evidenceItems}
            sources={evidenceSources}
            resumeLinks={resumeLinks}
            resumeId={application.resume_id}
            cvData={initialCv ?? initialCVData}
            busy={shelfBusy}
            onAttach={async (input) => {
              const failure = await handleAttach(input);
              if (failure) setShelfMessage(failure);
              return failure;
            }}
            onDetach={handleDetach}
          />
        }
        sidebarExtras={requirementsInspector}
        assistantOpportunity={assistantOpportunity}
        assistantOpportunityError={
          application.job
            ? null
            : 'The original posting is unavailable, so grounded assistance is disabled for this application.'
        }
        postSaveAction={{ label: 'Back to application', to: backTo }}
        refreshIntelligence={false}
      />
    </PageLayout>
  );
}
