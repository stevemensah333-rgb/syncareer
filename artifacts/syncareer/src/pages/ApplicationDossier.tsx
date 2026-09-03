import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DossierActionBar,
  DossierHeader,
  DossierSection,
  RecordState,
  WorkingDocument,
} from '@/components/dossier';
import { DossierRequirementsEvidence } from '@/components/applications/dossier/DossierRequirementsEvidence';
import { DossierEvidenceLedger } from '@/components/applications/dossier/DossierEvidenceLedger';
import { DossierIndexNav, type IndexNavStage } from '@/components/applications/dossier/DossierIndexNav';
import { ApplicationEvidenceInspector, type InspectorSelection } from '@/components/applications/dossier/ApplicationEvidenceInspector';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseUserId } from '@/hooks/useSupabaseUserId';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  saveApplicationNotes,
  updateApplicationStatus,
  updateApplicationWorkspace,
  updateInterviewApplicationLink,
} from '@/features/application-tracker/tracking';
import {
  STATUS_EDITOR_GROUPS,
  buildJourney,
  canRecordStatus,
  statusLabel,
} from '@/features/application-tracker/workflow';
import { applicationFacts, nextActionDueState, type WorkspaceResume } from '@/features/application-tracker/workspace';
import { getOrganisation, getProvenanceFacts } from '@/features/opportunities/opportunity';
import { loadDossierBundle, type DossierBundle, type DossierEvidenceData, type DossierMentorRequest } from '@/features/application-dossier/dossier';
import {
  addEvidenceSource,
  addManualApplicationRequirement,
  archiveEvidenceItem,
  confirmEvidenceItem,
  createApplicationCv,
  createEvidenceItem,
  initializeApplicationRequirements,
  linkEvidenceToRequirement,
  removeApplicationRequirement,
  removeEvidenceSource,
  unlinkEvidenceFromRequirement,
} from '@/features/evidence/api';
import type { EvidenceCategory, EvidenceSourceType } from '@/features/evidence/types';
import { ContextualAssistantDrawer } from '@/components/assistant/ContextualAssistantDrawer';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

type SaveState = 'idle' | 'saving' | 'saved' | 'failed';

const SECTION_ORDER = ['brief', 'progress', 'requirements', 'ledger', 'cv', 'interview', 'mentor'] as const;
type SectionId = (typeof SECTION_ORDER)[number];

const SECTION_LABELS: Record<SectionId, string> = {
  brief: 'Overview',
  progress: 'Next step',
  requirements: 'Requirements',
  ledger: 'Evidence',
  cv: 'CV',
  interview: 'Interview',
  mentor: 'Mentor',
};

export default function ApplicationDossier() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const userId = useSupabaseUserId();
  const isMobile = useIsMobile();
  const isCompact = useDossierCompact(isMobile);
  const pageRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({});

  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState<DossierBundle | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [applicationError, setApplicationError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [activeSection, setActiveSection] = useState<SectionId>('brief');
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesState, setNotesState] = useState<SaveState>('idle');
  const [workspaceState, setWorkspaceState] = useState<SaveState>('idle');
  const [sectionBusy, setSectionBusy] = useState(false);
  const [evidenceWarning, setEvidenceWarning] = useState<string | null>(null);
  const [cvBusy, setCvBusy] = useState(false);
  const [cvSourceId, setCvSourceId] = useState<string>('');
  const assistantUndoNotes = useRef<string | null>(null);

  useEffect(() => {
    if (!userId || !applicationId) return;
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    setApplicationError(null);
    (async () => {
      const state = await loadDossierBundle(supabase, applicationId, userId);
      if (cancelled) return;
      if (state.notFound) setNotFound(true);
      else if (state.applicationError) setApplicationError(state.applicationError.userMessage);
      else setBundle(state.bundle);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, applicationId, reloadKey]);

  // Deep-route navigation places focus on the dossier heading region.
  useEffect(() => {
    if (!loading && bundle) pageRef.current?.focus();
  }, [loading, bundle, applicationId]);

  const application = bundle?.application ?? null;
  const facts = useMemo(() => (application ? applicationFacts(application) : null), [application]);
  const organisation = facts ? (getOrganisation(facts) ?? 'Organisation not specified') : '';
  const provenance = facts ? getProvenanceFacts(facts) : null;
  const dueState = application ? nextActionDueState(application.next_action, application.next_action_due) : 'none';
  const journey = useMemo(() => buildJourney(application?.status ?? ''), [application?.status]);
  const evidence = bundle?.evidence ?? null;

  // Default the context panel to the first requirement, then to the first
  // evidence record when requirements are not yet available.
  useEffect(() => {
    if (!evidence) return;
    if (inspectorSelection?.kind === 'requirement' && !evidence.requirements.some((item) => item.id === inspectorSelection.id)) {
      setInspectorSelection(evidence.requirements[0] ? { kind: 'requirement', id: evidence.requirements[0].id } : null);
      return;
    }
    if (inspectorSelection?.kind === 'evidence' && !evidence.items.some((item) => item.id === inspectorSelection.id)) {
      setInspectorSelection(evidence.requirements[0] ? { kind: 'requirement', id: evidence.requirements[0].id } : null);
      return;
    }
    if (!inspectorSelection) {
      setInspectorSelection(
        evidence.requirements[0]
          ? { kind: 'requirement', id: evidence.requirements[0].id }
          : evidence.items[0]
            ? { kind: 'evidence', id: evidence.items[0].id }
            : null,
      );
    }
  }, [evidence, inspectorSelection]);

  const handleSelectRequirement = (requirementId: string) => {
    setInspectorSelection({ kind: 'requirement', id: requirementId });
    if (isCompact) setMobileInspectorOpen(true);
  };

  const handleSelectEvidence = (evidenceId: string) => {
    setInspectorSelection({ kind: 'evidence', id: evidenceId });
    if (isCompact) setMobileInspectorOpen(true);
  };

  const [notes, setNotes] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [due, setDue] = useState('');
  const [hydratedFor, setHydratedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!application || hydratedFor === application.id) return;
    setNotes(application.notes ?? '');
    setNextAction(application.next_action ?? '');
    setDue(application.next_action_due ?? '');
    setHydratedFor(application.id);
  }, [application, hydratedFor]);

  const notesDirty = application ? notes.trim() !== (application.notes ?? '') : false;
  const actionDirty = application
    ? nextAction.trim() !== (application.next_action ?? '') || due !== (application.next_action_due ?? '')
    : false;

  const reload = useCallback(() => setReloadKey((value) => value + 1), []);

  const handleStatus = async (status: string) => {
    if (!application || !userId || !canRecordStatus(application.status, status)) return;
    setStatusSaving(true);
    const result = await updateApplicationStatus(supabase, application.id, status, userId);
    setStatusSaving(false);
    if (!result.ok) {
      toast.error(result.userMessage);
      return;
    }
    setBundle((current) => (current ? { ...current, application: { ...current.application, status } } : current));
    toast.success(`Stage updated to ${statusLabel(status)}`);
  };

  const handleNotes = async () => {
    if (!application || !userId) return;
    setNotesState('saving');
    const result = await saveApplicationNotes(supabase, application.id, notes, userId);
    if (!result.ok) {
      setNotesState('failed');
      return;
    }
    const saved = notes.trim() || null;
    setBundle((current) => (current ? { ...current, application: { ...current.application, notes: saved } } : current));
    setNotesState('saved');
  };

  const handleWorkspace = async (update: { resume_id?: string | null; next_action?: string | null; next_action_due?: string | null }) => {
    if (!application || !userId) return;
    if (update.resume_id && !bundle?.resumes.some((resume) => resume.id === update.resume_id)) {
      toast.error('That CV is not available to link.');
      return;
    }
    setWorkspaceState('saving');
    const result = await updateApplicationWorkspace(supabase, application.id, userId, update);
    if (!result.ok) {
      setWorkspaceState('failed');
      return;
    }
    setBundle((current) =>
      current
        ? {
            ...current,
            application: {
              ...current.application,
              ...update,
              next_action:
                update.next_action === undefined
                  ? current.application.next_action
                  : (update.next_action ?? '').trim() || null,
              next_action_due:
                update.next_action_due === undefined
                  ? current.application.next_action_due
                  : (update.next_action ?? '').trim() === ''
                    ? null
                    : update.next_action_due,
            },
          }
        : current,
    );
    if (update.next_action?.trim()) {
      captureProductEvent(ANALYTICS_EVENTS.APPLICATION_NEXT_ACTION_SET, { has_due_date: Boolean(update.next_action_due) });
    }
    setWorkspaceState('saved');
  };

  const handleInterviewLink = async (interviewId: string, linked: boolean) => {
    if (!application || !userId) return;
    if (linked && !bundle?.interviews.some((interview) => interview.id === interviewId)) return;
    const result = await updateInterviewApplicationLink(supabase, interviewId, userId, linked ? application.id : null);
    if (!result.ok) {
      toast.error(result.userMessage);
      return;
    }
    setBundle((current) =>
      current
        ? {
            ...current,
            interviews: current.interviews.map((interview) =>
              interview.id === interviewId ? { ...interview, application_id: linked ? application.id : null } : interview,
            ),
          }
        : current,
    );
  };

  // ── Evidence mutations (optimistic linking with visible rollback) ────────

  const patchEvidence = (patch: (current: DossierEvidenceData) => DossierEvidenceData) => {
    setBundle((current) => (current?.evidence ? { ...current, evidence: patch(current.evidence) } : current));
  };

  const handleLinkEvidence = async (requirementId: string, evidenceId: string, relevanceNote: string | null): Promise<boolean> => {
    const previous = bundle?.evidence ?? null;
    const optimisticLink = {
      id: `optimistic-${requirementId}-${evidenceId}`,
      requirement_id: requirementId,
      evidence_id: evidenceId,
      user_id: userId ?? '',
      relevance_note: relevanceNote,
      created_at: new Date().toISOString(),
    };
    patchEvidence((current) => ({
      ...current,
      links: [...current.links.filter((l) => !(l.requirement_id === requirementId && l.evidence_id === evidenceId)), optimisticLink],
    }));
    const result = await linkEvidenceToRequirement(supabase, { requirementId, evidenceId, relevanceNote });
    if (!result.ok) {
      setBundle((current) => (current && previous ? { ...current, evidence: previous } : current));
      setEvidenceWarning(result.userMessage);
      return false;
    }
    patchEvidence((current) => ({
      ...current,
      links: current.links.map((link) => (link.id === optimisticLink.id ? result.data : link)),
    }));
    setEvidenceWarning(null);
    return true;
  };

  const handleUnlinkEvidence = async (requirementId: string, evidenceId: string): Promise<boolean> => {
    const previous = bundle?.evidence ?? null;
    patchEvidence((current) => ({
      ...current,
      links: current.links.filter((link) => !(link.requirement_id === requirementId && link.evidence_id === evidenceId)),
    }));
    const result = await unlinkEvidenceFromRequirement(supabase, requirementId, evidenceId);
    if (!result.ok) {
      setBundle((current) => (current && previous ? { ...current, evidence: previous } : current));
      setEvidenceWarning(result.userMessage);
      return false;
    }
    setEvidenceWarning(null);
    return true;
  };

  const handleImportSkills = async (): Promise<string | null> => {
    if (!application) return 'Application is not available.';
    setSectionBusy(true);
    const result = await initializeApplicationRequirements(supabase, application.id);
    setSectionBusy(false);
    if (!result.ok) return result.userMessage;
    patchEvidence((current) => ({ ...current, requirements: result.data.requirements }));
    return null;
  };

  const handleAddRequirement = async (label: string, detail: string | null): Promise<string | null> => {
    if (!application) return 'Application is not available.';
    setSectionBusy(true);
    const result = await addManualApplicationRequirement(supabase, application.id, label, detail);
    setSectionBusy(false);
    if (!result.ok) return result.userMessage;
    patchEvidence((current) => ({ ...current, requirements: [...current.requirements, result.data] }));
    return null;
  };

  const handleRemoveRequirement = async (requirementId: string): Promise<boolean> => {
    setSectionBusy(true);
    const result = await removeApplicationRequirement(supabase, requirementId);
    setSectionBusy(false);
    if (!result.ok) {
      setEvidenceWarning(result.userMessage);
      return false;
    }
    patchEvidence((current) => ({
      ...current,
      requirements: current.requirements.filter((requirement) => requirement.id !== requirementId),
      links: current.links.filter((link) => link.requirement_id !== requirementId),
    }));
    return true;
  };

  const handleCreateEvidence = async (input: {
    category: EvidenceCategory;
    title: string;
    summary: string;
    occurredOn: string | null;
  }): Promise<string | null> => {
    setSectionBusy(true);
    const result = await createEvidenceItem(supabase, input);
    setSectionBusy(false);
    if (!result.ok) return result.userMessage;
    patchEvidence((current) => ({ ...current, items: [result.data, ...current.items] }));
    return null;
  };

  const handleConfirmEvidence = async (evidenceId: string): Promise<boolean> => {
    setSectionBusy(true);
    const result = await confirmEvidenceItem(supabase, evidenceId);
    setSectionBusy(false);
    if (!result.ok) {
      setEvidenceWarning(result.userMessage);
      return false;
    }
    patchEvidence((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === evidenceId ? result.data : item)),
    }));
    return true;
  };

  const handleArchiveEvidence = async (evidenceId: string): Promise<boolean> => {
    setSectionBusy(true);
    const result = await archiveEvidenceItem(supabase, evidenceId);
    setSectionBusy(false);
    if (!result.ok) {
      setEvidenceWarning(result.userMessage);
      return false;
    }
    patchEvidence((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === evidenceId ? result.data : item)),
    }));
    return true;
  };

  const handleAddSource = async (input: {
    evidenceId: string;
    sourceType: EvidenceSourceType;
    sourceLabel: string;
    sourceExcerpt: string;
    sourceUrl: string | null;
    entryLocator: string | null;
    resumeId: string | null;
    interviewId: string | null;
  }): Promise<string | null> => {
    setSectionBusy(true);
    const result = await addEvidenceSource(supabase, input);
    setSectionBusy(false);
    if (!result.ok) return result.userMessage;
    patchEvidence((current) => ({ ...current, sources: [...current.sources, result.data] }));
    return null;
  };

  const handleRemoveSource = async (sourceId: string): Promise<boolean> => {
    setSectionBusy(true);
    const result = await removeEvidenceSource(supabase, sourceId);
    setSectionBusy(false);
    if (!result.ok) {
      setEvidenceWarning(result.userMessage);
      return false;
    }
    patchEvidence((current) => ({ ...current, sources: current.sources.filter((source) => source.id !== sourceId) }));
    return true;
  };

  const handleCreateApplicationCv = async (): Promise<string | null> => {
    if (!application || !cvSourceId) return 'Choose a source CV first.';
    setCvBusy(true);
    const result = await createApplicationCv(supabase, application.id, cvSourceId);
    setCvBusy(false);
    if (!result.ok) return result.userMessage;
    const created = result.data;
    setBundle((current) => {
      if (!current) return current;
      const resumes: WorkspaceResume[] = current.resumes.some((resume) => resume.id === created.id)
        ? current.resumes
        : [
            { id: created.id, user_id: userId ?? '', title: created.title, updated_at: new Date().toISOString() },
            ...current.resumes,
          ];
      return { ...current, resumes, application: { ...current.application, resume_id: created.id } };
    });
    return null;
  };

  // ── Section renderers (plain calls, not components, to preserve focus) ───

  const renderBrief = () => (
    <DossierSection label="Overview" title="The role as recorded">
      {application?.job === null && (
        <RecordState
          tone="warning"
          title="The source posting is unavailable"
          description="This dossier uses the durable facts saved with your application. Live posting details cannot be refreshed."
          className="mb-4"
        />
      )}
      {facts && (
        <dl className="divide-y divide-border border-y border-border text-sm">
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Organisation</dt>
            <dd className="text-right font-medium">{organisation}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Location</dt>
            <dd className="text-right font-medium">{facts.location || 'Not specified'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Role type</dt>
            <dd className="text-right font-medium">{facts.employment_type || 'Not provided'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Deadline</dt>
            <dd className="text-right font-medium">{facts.application_deadline || 'Not provided'}</dd>
          </div>
          <div className="flex items-start justify-between gap-4 py-3">
            <dt className="text-muted-foreground">Source</dt>
            <dd className="text-right">
              <span className="font-medium">{provenance?.sourceLabel}</span>
              {provenance?.sourceUrl && (
                <a
                  className="mt-1 inline-flex items-center gap-1 text-primary hover:underline"
                  href={provenance.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Original source <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                </a>
              )}
              {!provenance?.sourceUrl && <p className="text-muted-foreground">Original link unavailable.</p>}
            </dd>
          </div>
        </dl>
      )}
    </DossierSection>
  );

  const renderProgress = () => (
    <DossierSection label="Next step" title="Where the application stands">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="dossier-eyebrow">Stage</p>
          <Select
            value={application?.status ?? undefined}
            disabled={statusSaving || !application}
            onValueChange={(value) => {
              if (canRecordStatus(application?.status ?? '', value)) void handleStatus(value);
            }}
          >
            <SelectTrigger aria-label="Application stage" className="max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_EDITOR_GROUPS.map((group) => (
                <SelectGroup key={group.id}>
                  <SelectLabel>{group.label}</SelectLabel>
                  {group.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          {journey.unknownStatus && (
            <p className="text-xs text-warning">The saved stage is not in the current vocabulary, so no position is inferred.</p>
          )}
          <p className="max-w-xl text-xs text-muted-foreground">
            Stages record what you know now. Past stages are not invented for closed applications.
          </p>
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="dossier-eyebrow">Next action</p>
          {application?.next_action ? (
            <p className="text-sm font-medium">{application.next_action}</p>
          ) : (
            <p className="text-sm text-muted-foreground">No next action set.</p>
          )}
          {application?.next_action && application.next_action_due && (
            <p
              className={`text-xs ${
                dueState === 'overdue' ? 'text-destructive' : dueState === 'today' ? 'text-warning' : 'text-muted-foreground'
              }`}
            >
              {dueState === 'overdue' ? 'Overdue' : dueState === 'today' ? 'Due today' : 'Upcoming'} ·{' '}
              {application.next_action_due}
            </p>
          )}
          <div className="grid max-w-xl gap-2 sm:grid-cols-2">
            <Input
              aria-label="Next action"
              value={nextAction}
              onChange={(event) => setNextAction(event.target.value)}
              placeholder="e.g. Follow up with the recruiter"
            />
            <Input
              aria-label="Next action due date"
              type="date"
              value={due}
              disabled={!nextAction.trim()}
              onChange={(event) => setDue(event.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={!actionDirty || workspaceState === 'saving' || !application}
            onClick={() =>
              void handleWorkspace({ next_action: nextAction, next_action_due: nextAction.trim() ? due || null : null })
            }
          >
            {workspaceState === 'saving' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
            Save next action
          </Button>
          <SaveMessage state={workspaceState} />
        </div>

        <div className="space-y-2 border-t border-border pt-4">
          <p className="dossier-eyebrow">Notes</p>
          <Textarea
            aria-label="Application notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={5}
          />
          {facts && (
            <ContextualAssistantDrawer
              task="application.draft_follow_up"
              description="Draft a follow-up or organise notes using only the role facts and optional notes you choose to send."
              suggestedPrompt="Draft a concise follow-up using only the supplied facts. Leave placeholders for any contact name or date that was not supplied."
              context={[
                {
                  id: 'application-role',
                  label: facts.title || 'Application',
                  provenance: 'opportunity',
                  content: [facts.title, organisation, application?.status].filter(Boolean).join(' · '),
                },
                {
                  id: 'application-notes',
                  label: 'Application notes',
                  provenance: 'application_notes',
                  content: notes,
                  optional: true,
                  personal: true,
                },
              ]}
              acceptLabel="Add to notes draft"
              onAccept={(text) => {
                assistantUndoNotes.current = notes;
                setNotes((current) => (current.trim() ? `${current.trim()}\n\n${text}` : text));
              }}
              onUndo={() => {
                if (assistantUndoNotes.current !== null) {
                  setNotes(assistantUndoNotes.current);
                  assistantUndoNotes.current = null;
                }
              }}
            />
          )}
          <div>
            <Button size="sm" disabled={!notesDirty || notesState === 'saving' || !application} onClick={() => void handleNotes()}>
              {notesState === 'saving' && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              {notesState === 'failed' && <RotateCcw aria-hidden="true" className="h-4 w-4" />}
              {notesState === 'failed' ? 'Retry save' : 'Save notes'}
            </Button>
          </div>
          <SaveMessage state={notesState} />
        </div>
      </div>
    </DossierSection>
  );

  const renderRequirements = () => (
    <DossierSection
      label="Requirements"
      title="Requirements"
      description="Each requirement lists the evidence you have attached to answer it."
    >
      {evidence ? (
        <DossierRequirementsEvidence
          requirements={evidence.requirements}
          links={evidence.links}
          items={evidence.items}
          sources={evidence.sources}
          resumeLinks={evidence.resumeLinks}
          postingSkillCount={facts?.skills?.length ?? 0}
          busy={sectionBusy}
          selectedRequirementId={inspectorSelection?.kind === 'requirement' ? inspectorSelection.id : null}
          onSelectRequirement={handleSelectRequirement}
          selectedEvidenceId={inspectorSelection?.kind === 'evidence' ? inspectorSelection.id : null}
          onSelectEvidence={handleSelectEvidence}
          onLinkEvidence={handleLinkEvidence}
          onUnlinkEvidence={handleUnlinkEvidence}
          onImportPostingSkills={handleImportSkills}
          onAddManualRequirement={handleAddRequirement}
          onRemoveRequirement={handleRemoveRequirement}
        />
      ) : (
        <RecordState
          tone="warning"
          title="Evidence records are temporarily unavailable"
          description={bundle?.evidenceError?.userMessage ?? 'Retry to load requirements and evidence.'}
          action={
            <Button size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          }
        />
      )}
    </DossierSection>
  );

  const renderLedger = () => (
    <DossierSection
      label="Evidence"
      title="Evidence"
      description="A durable record of real work, projects, and achievements you can attach to any application."
    >
      {evidence ? (
        <DossierEvidenceLedger
          items={evidence.items}
          sources={evidence.sources}
          resumes={bundle?.resumes ?? []}
          interviews={(bundle?.interviews ?? []).map((interview) => ({
            id: interview.id,
            label: interview.job_role || 'Interview practice',
          }))}
          busy={sectionBusy}
          selectedEvidenceId={inspectorSelection?.kind === 'evidence' ? inspectorSelection.id : null}
          onSelectEvidence={handleSelectEvidence}
          onCreateEvidence={handleCreateEvidence}
          onConfirmEvidence={handleConfirmEvidence}
          onArchiveEvidence={handleArchiveEvidence}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
        />
      ) : (
        <RecordState
          tone="warning"
          title="Evidence records are temporarily unavailable"
          description={bundle?.evidenceError?.userMessage ?? 'Retry to load the ledger.'}
          action={
            <Button size="sm" variant="outline" onClick={reload}>
              Retry
            </Button>
          }
        />
      )}
    </DossierSection>
  );

  const cvHref = application ? `/applications/${encodeURIComponent(application.id)}/cv` : '/cv-builder';

  const renderCv = () => (
    <DossierSection
      label="CV"
      title="CV"
      description="The application CV is an independent copy of a base CV; editing it never changes the original."
    >
      <div className="space-y-4">
        <div className="max-w-sm space-y-2">
          <p className="dossier-eyebrow">Linked CV</p>
          <Select
            value={application?.resume_id ?? 'none'}
            onValueChange={(value) => void handleWorkspace({ resume_id: value === 'none' ? null : value })}
          >
            <SelectTrigger aria-label="Linked CV">
              <SelectValue placeholder="No linked CV" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No linked CV</SelectItem>
              {(bundle?.resumes ?? []).map((resume) => (
                <SelectItem key={resume.id} value={resume.id}>
                  {resume.title || 'Untitled CV'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="max-w-sm space-y-2 border-t border-border pt-4">
          <p className="dossier-eyebrow">Create the application CV</p>
          <Select value={cvSourceId} onValueChange={setCvSourceId}>
            <SelectTrigger aria-label="Source CV to copy">
              <SelectValue placeholder="Copy from CV" />
            </SelectTrigger>
            <SelectContent>
              {(bundle?.resumes ?? []).map((resume) => (
                <SelectItem key={resume.id} value={resume.id}>
                  {resume.title || 'Untitled CV'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" disabled={cvBusy || !cvSourceId} onClick={() => void handleCreateApplicationCv()}>
              {cvBusy && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none" />}
              Create application CV
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to={cvHref}>
                <FileText aria-hidden="true" className="h-4 w-4" />
                Open CV editor
              </Link>
            </Button>
          </div>
          {!bundle?.resumes.length && (
            <p className="text-sm text-muted-foreground">
              Create a base CV first — the application copy is made from it without changing the original.
            </p>
          )}
        </div>
      </div>
    </DossierSection>
  );

  const renderInterview = () => {
    const linked = (bundle?.interviews ?? []).filter((interview) => interview.application_id === application?.id);
    const available = (bundle?.interviews ?? []).filter((interview) => !interview.application_id);
    const practiceHref = application ? `/applications/${encodeURIComponent(application.id)}/interview` : '/interview-simulator';
    return (
      <DossierSection label="Interview" title="Interview">
        <div className="space-y-4">
          {linked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No interview practice linked to this application yet.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {linked.map((interview) => (
                <li key={interview.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="min-w-0 truncate font-medium">{interview.job_role || 'Interview practice'}</span>
                  <Button size="sm" variant="ghost" onClick={() => void handleInterviewLink(interview.id, false)}>
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {available.length > 0 && (
            <div className="max-w-sm space-y-2">
              <p className="dossier-eyebrow">Link existing practice</p>
              <Select onValueChange={(id) => void handleInterviewLink(id, true)}>
                <SelectTrigger aria-label="Link interview practice">
                  <SelectValue placeholder="Choose a session" />
                </SelectTrigger>
                <SelectContent>
                  {available.map((interview) => (
                    <SelectItem key={interview.id} value={interview.id}>
                      {interview.job_role || 'Interview practice'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link to={practiceHref}>
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
              Start practice
            </Link>
          </Button>
        </div>
      </DossierSection>
    );
  };

  const renderMentor = () => {
    const requests: DossierMentorRequest[] = bundle?.mentorRequests ?? [];
    return (
      <DossierSection
        label="Mentor"
        title="Mentor"
        description="Requests connect at the application level. Your evidence is never shared with mentors."
      >
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No mentor requests for this application yet.</p>
          ) : (
            <ul className="divide-y divide-border border-y border-border">
              {requests.map((request) => (
                <li key={request.id} className="py-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{request.mentor_name ?? 'Mentor'}</span>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">{request.status}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-muted-foreground">{request.goal}</p>
                </li>
              ))}
            </ul>
          )}
          <Button size="sm" variant="outline" asChild>
            <Link to={application ? `/mentors?application=${encodeURIComponent(application.id)}` : '/mentors'}>
              <MessageSquare aria-hidden="true" className="h-4 w-4" />
              Find a mentor
            </Link>
          </Button>
        </div>
      </DossierSection>
    );
  };

  // ── Page states ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="Loading dossier">
        <div className="dossier-document overflow-hidden">
          <div className="h-40 animate-pulse border-b border-border bg-muted/60 motion-reduce:animate-none" />
          <div className="h-12 animate-pulse border-b border-border bg-muted/40 motion-reduce:animate-none" />
          <div className="h-64 animate-pulse bg-muted/25 motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4 py-6">
        <RecordState
          tone="error"
          title="Dossier not found"
          description="This application does not exist or belongs to another account."
          action={
            <Button variant="outline" onClick={() => navigate('/applications')}>
              Back to applications
            </Button>
          }
        />
      </div>
    );
  }

  if (applicationError || !application || !facts) {
    return (
      <div className="space-y-4 py-6">
        <RecordState
          tone="error"
          title="The dossier could not be loaded"
          description={applicationError ?? 'Retry to load this application.'}
          action={
            <Button variant="outline" onClick={reload}>
              Try again
            </Button>
          }
        />
      </div>
    );
  }

  const railStages: IndexNavStage[] = journey.steps.map((step) => ({
    id: step.stage,
    label: step.label,
    state: step.state,
  }));
  const sections = [
    { id: 'brief' as const, node: renderBrief() },
    { id: 'progress' as const, node: renderProgress() },
    { id: 'requirements' as const, node: renderRequirements() },
    { id: 'ledger' as const, node: renderLedger() },
    { id: 'cv' as const, node: renderCv() },
    { id: 'interview' as const, node: renderInterview() },
    { id: 'mentor' as const, node: renderMentor() },
  ];

  const selectSection = (section: string) => {
    const id = section as SectionId;
    setActiveSection(id);
    if (isCompact) return;
    const target = sectionRefs.current[id];
    if (target) {
      requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
    }
  };

  const handleSectionKey = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % SECTION_ORDER.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + SECTION_ORDER.length) % SECTION_ORDER.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = SECTION_ORDER.length - 1;
    if (nextIndex === undefined) return;
    const next = SECTION_ORDER[nextIndex];
    if (!next) return;
    event.preventDefault();
    selectSection(next);
  };

  const renderSection = (id: SectionId) => {
    const section = sections.find((candidate) => candidate.id === id);
    if (!section) return null;
    return (
      <div
        key={id}
        id={`dossier-section-${id}`}
        ref={(node) => {
          sectionRefs.current[id] = node;
        }}
        className="scroll-mt-4"
      >
        {section.node}
      </div>
    );
  };

  const inspectorTitle = 'Evidence context';

  return (
    <div ref={pageRef} tabIndex={-1} className="space-y-0 focus:outline-none">
      <div className={isCompact ? 'grid gap-4' : 'grid items-start gap-5 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]'}>
        {!isCompact && (
          <div className="hidden lg:sticky lg:top-4 lg:block lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto lg:overscroll-contain">
            <DossierIndexNav
              applicationTitle={facts.title || 'Tracked application'}
              description={[organisation, facts.location].filter(Boolean).join(' · ')}
              statusLabel={statusLabel(application.status)}
              stages={railStages}
              sections={SECTION_ORDER.map((id) => ({ id, label: SECTION_LABELS[id] }))}
              activeSectionId={activeSection}
              onSelectSection={selectSection}
            />
          </div>
        )}

        <div className="min-w-0">
          {isCompact && (
            <div className="mb-4">
              <Button variant="ghost" size="sm" onClick={() => navigate('/applications')}>
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                All applications
              </Button>
            </div>
          )}

          {isCompact && (
            <div className="mb-4 space-y-2">
              <nav aria-label="Application sections" className="overflow-x-auto border border-border bg-card">
                <div className="flex min-w-max px-2">
                  {SECTION_ORDER.map((section, index) => {
                    const active = section === activeSection;
                    return (
                      <button
                        key={section}
                        type="button"
                        aria-pressed={active}
                        tabIndex={0}
                        onClick={() => selectSection(section)}
                        onKeyDown={(event) => handleSectionKey(event, index)}
                        className={`relative min-h-12 border-r border-border px-3 text-xs font-medium transition-colors duration-150 last:border-r-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring motion-reduce:transition-none ${
                          active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                      >
                        {SECTION_LABELS[section]}
                        {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" />}
                      </button>
                    );
                  })}
                </div>
              </nav>

              <div className="flex items-center justify-end gap-2">
                {inspectorSelection && (
                  <Button size="sm" variant="outline" onClick={() => setMobileInspectorOpen(true)}>
                    {inspectorTitle}
                  </Button>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="ghost" aria-label="More application navigation">
                      More
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-72">
                    <div>
                      <p className="dossier-eyebrow">Application</p>
                      <h2 className="mt-1 text-sm font-semibold">{facts.title || 'Tracked application'}</h2>
                      <p className="mt-1 text-xs text-muted-foreground">{statusLabel(application.status)}</p>
                    </div>
                    <div className="mt-4">
                      <p className="dossier-eyebrow">Stage</p>
                      <ol aria-label="Application stages" className="mt-2 space-y-2">
                        {railStages.map((stage) => (
                          <li key={stage.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span
                              aria-hidden="true"
                              className={`flex h-4 w-4 items-center justify-center border bg-card ${
                                stage.state === 'done'
                                  ? 'border-success bg-success text-success-foreground'
                                  : stage.state === 'current'
                                    ? 'border-primary text-primary'
                                    : 'border-border text-muted-foreground'
                              }`}
                            >
                              {stage.state === 'done' ? '✓' : stage.state === 'current' ? '●' : '·'}
                            </span>
                            <span className="sr-only">{stage.state}</span>
                            <span className={stage.state === 'current' ? 'font-semibold text-foreground' : ''}>
                              {stage.label}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <WorkingDocument label={`Application: ${facts.title || 'Tracked application'}`}>
            <DossierHeader
              eyebrow="Application"
              title={facts.title || 'Tracked application'}
              description={[organisation, facts.location].filter(Boolean).join(' · ')}
              metadata={<span className="font-mono">{statusLabel(application.status)}</span>}
            />

            {isCompact ? (
              <>
                {evidenceWarning && (
                  <div className="p-4">
                    <RecordState
                      tone="warning"
                      title="That change did not save"
                      description={evidenceWarning}
                      action={
                        <Button size="sm" variant="outline" onClick={() => setEvidenceWarning(null)}>
                          Dismiss
                        </Button>
                      }
                    />
                  </div>
                )}
                <div className="p-4">{renderSection(activeSection)}</div>
                <DossierActionBar>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={cvHref}>
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      {application.resume_id ? 'Open CV editor' : 'Prepare CV'}
                    </Link>
                  </Button>
                </DossierActionBar>
              </>
            ) : (
              <div className="divide-y divide-border">
                {evidenceWarning && (
                  <div className="p-4 sm:px-6">
                    <RecordState
                      tone="warning"
                      title="That change did not save"
                      description={evidenceWarning}
                      action={
                        <Button size="sm" variant="outline" onClick={() => setEvidenceWarning(null)}>
                          Dismiss
                        </Button>
                      }
                    />
                  </div>
                )}
                <div className="divide-y divide-border">
                  {SECTION_ORDER.map((id) => (
                    <div key={id} className="px-4 py-6 sm:px-6">
                      {renderSection(id)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </WorkingDocument>
        </div>

        {!isCompact && evidence && (
          <div className="hidden xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:overscroll-contain">
            <ApplicationEvidenceInspector data={evidence} selection={inspectorSelection} />
          </div>
        )}
      </div>

      {isCompact && evidence && (
        <Sheet open={mobileInspectorOpen} onOpenChange={setMobileInspectorOpen}>
          <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-lg">
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="dossier-title text-lg">{inspectorTitle}</SheetTitle>
              <SheetDescription className="text-xs text-muted-foreground">
                Context for the currently selected requirement or evidence.
              </SheetDescription>
            </SheetHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
              <ApplicationEvidenceInspector data={evidence} selection={inspectorSelection} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function useDossierCompact(isMobile: boolean): boolean {
  const readCompact = () =>
    isMobile || (typeof window !== 'undefined' && typeof window.innerWidth === 'number' && window.innerWidth < 1280);
  const [compact, setCompact] = useState(readCompact);

  useEffect(() => {
    const update = () => setCompact(readCompact());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [isMobile]);

  return compact;
}

function SaveMessage({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  return (
    <p role="status" className={`text-xs ${state === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
      {state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Save failed. Your changes are still here; retry when ready.'}
    </p>
  );
}
