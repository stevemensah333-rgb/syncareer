import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, FileText, Loader2, MessageSquare, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ApplicationStageRail,
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
  removeApplicationRecord,
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
import { buildRequirementThreads, threadCoverage } from '@/features/evidence/dossierViewModel';
import { deriveSupportStatus } from '@/features/evidence/supportStatus';
import { cn } from '@/lib/utils';
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

function parseSectionParam(value: string | null): SectionId | null {
  return value && (SECTION_ORDER as readonly string[]).includes(value) ? (value as SectionId) : null;
}

/** URL form of an inspector selection: `requirement:<id>` or `evidence:<id>`. */
function parseFocusParam(value: string | null): InspectorSelection {
  if (!value) return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  const kind = value.slice(0, separator);
  const id = value.slice(separator + 1);
  if (!id) return null;
  if (kind === 'requirement' || kind === 'evidence') return { kind, id };
  return null;
}

function focusParamValue(selection: InspectorSelection): string | null {
  return selection ? `${selection.kind}:${selection.id}` : null;
}

export default function ApplicationDossier() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
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

  // Deep-link state lives in the URL: `section` for the visible section and
  // `focus` for the inspected requirement/evidence. Selection changes are
  // written back with replace so sharing and refresh keep the context.
  const [activeSection, setActiveSection] = useState<SectionId>(
    () => parseSectionParam(searchParams.get('section')) ?? 'brief',
  );
  const initialFocusParam = useRef<string | null>(searchParams.get('focus'));
  const [inspectorSelection, setInspectorSelection] = useState<InspectorSelection>(null);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  const [pendingFocus, setPendingFocus] = useState<{ section: SectionId; elementId: string } | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  // A `section` deep link scrolls the document to that section once on load.
  const initialSectionScrolled = useRef(false);
  useEffect(() => {
    if (loading || !bundle || initialSectionScrolled.current || isCompact) return;
    initialSectionScrolled.current = true;
    if (activeSection !== 'brief') {
      requestAnimationFrame(() => {
        sectionRefs.current[activeSection]?.scrollIntoView({ behavior: 'auto', block: 'start' });
      });
    }
  }, [loading, bundle, activeSection, isCompact]);

  const application = bundle?.application ?? null;
  const facts = useMemo(() => (application ? applicationFacts(application) : null), [application]);
  const organisation = facts ? (getOrganisation(facts) ?? 'Organisation not specified') : '';
  const provenance = facts ? getProvenanceFacts(facts) : null;
  const dueState = application ? nextActionDueState(application.next_action, application.next_action_due) : 'none';
  const journey = useMemo(() => buildJourney(application?.status ?? ''), [application?.status]);
  const evidence = bundle?.evidence ?? null;

  // Progress facts for the strip under the header: requirement coverage and
  // evidence readiness, derived from the same rows the sections render.
  const evidenceFacts = useMemo(() => {
    if (!evidence) return null;
    const threads = buildRequirementThreads(
      evidence.requirements,
      evidence.links,
      evidence.items,
      evidence.sources,
      evidence.resumeLinks,
    );
    const coverage = threadCoverage(threads);
    const sourceCount = new Map<string, number>();
    for (const source of evidence.sources) {
      sourceCount.set(source.evidence_id, (sourceCount.get(source.evidence_id) ?? 0) + 1);
    }
    const readyCount = evidence.items.filter(
      (item) => deriveSupportStatus(item.review_status, sourceCount.get(item.id) ?? 0) === 'supported',
    ).length;
    return { coverage, readyCount, totalCount: evidence.items.length };
  }, [evidence]);

  const updateUrlParams = useCallback(
    (changes: { section?: SectionId; focus?: string | null }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (changes.section !== undefined) next.set('section', changes.section);
          if (changes.focus !== undefined) {
            if (changes.focus === null) next.delete('focus');
            else next.set('focus', changes.focus);
          }
          return next.toString() === prev.toString() ? prev : next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Keep the URL in step with the current inspector selection.
  useEffect(() => {
    updateUrlParams({ focus: focusParamValue(inspectorSelection) });
  }, [inspectorSelection, updateUrlParams]);

  // Default the context panel to the first requirement (honouring a `focus`
  // URL parameter on first load), then repair stale selections after edits.
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
      const requested = parseFocusParam(initialFocusParam.current);
      initialFocusParam.current = null;
      if (
        requested &&
        ((requested.kind === 'requirement' && evidence.requirements.some((item) => item.id === requested.id)) ||
          (requested.kind === 'evidence' && evidence.items.some((item) => item.id === requested.id)))
      ) {
        setInspectorSelection(requested);
        setActiveSection(requested.kind === 'requirement' ? 'requirements' : 'ledger');
        return;
      }
      setInspectorSelection(
        evidence.requirements[0]
          ? { kind: 'requirement', id: evidence.requirements[0].id }
          : evidence.items[0]
            ? { kind: 'evidence', id: evidence.items[0].id }
            : null,
      );
    }
  }, [evidence, inspectorSelection]);

  // Deferred focus move: closes the sheet on compact layouts, activates the
  // target section, then focuses the control once it is rendered.
  const focusControl = useCallback(
    (section: SectionId, elementId: string) => {
      if (isCompact) setMobileInspectorOpen(false);
      setActiveSection(section);
      setPendingFocus({ section, elementId });
    },
    [isCompact],
  );

  useEffect(() => {
    if (!pendingFocus) return;
    const frame = requestAnimationFrame(() => {
      const element = document.getElementById(pendingFocus.elementId);
      if (element) {
        if (!isCompact) {
          sectionRefs.current[pendingFocus.section]?.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        element.focus({ preventScroll: true });
      }
      setPendingFocus(null);
    });
    return () => cancelAnimationFrame(frame);
  }, [pendingFocus, isCompact]);

  // Screen-reader announcement for inspector changes: selection is otherwise
  // communicated visually in the right panel.
  const inspectorAnnouncement = useMemo(() => {
    if (!evidence || !inspectorSelection) return '';
    if (inspectorSelection.kind === 'requirement') {
      const requirement = evidence.requirements.find((item) => item.id === inspectorSelection.id);
      if (!requirement) return '';
      const linkedCount = evidence.links.filter((link) => link.requirement_id === requirement.id).length;
      return `Inspecting requirement ${requirement.label}. ${linkedCount} ${linkedCount === 1 ? 'evidence item' : 'evidence items'} attached.`;
    }
    const item = evidence.items.find((candidate) => candidate.id === inspectorSelection.id);
    return item ? `Inspecting evidence ${item.title}.` : '';
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

  const handleDelete = async () => {
    if (!application) return;
    setDeleting(true);
    const result = await removeApplicationRecord(supabase, application.id);
    if (!result.ok) {
      setDeleting(false);
      toast.error(result.userMessage);
      return;
    }
    toast.success('Application removed');
    navigate('/applications');
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

  const requirementLabel = (requirementId: string): string | null =>
    bundle?.evidence?.requirements.find((requirement) => requirement.id === requirementId)?.label ?? null;

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
    const label = requirementLabel(requirementId);
    toast.success(label ? `Evidence linked to “${label}”` : 'Evidence linked');
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
    toast.success('Evidence unlinked');
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
    toast.success('Evidence saved as a draft');
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
    toast.success('Evidence confirmed');
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
    toast.success('Evidence archived');
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
    toast.success('Source attached');
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
          description={bundle?.evidenceError?.userMessage ?? 'Retry to load evidence.'}
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
  const practiceHref = application
    ? `/applications/${encodeURIComponent(application.id)}/interview`
    : '/interview-simulator';

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
    updateUrlParams({ section: id });
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
    // Roving focus: arrows must move focus with selection, otherwise repeated
    // arrow presses re-select the same neighbour and strand the keyboard user.
    requestAnimationFrame(() => {
      document.getElementById(`dossier-section-tab-${next}`)?.focus();
    });
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

  // Progress strip: the application at a glance — stage, requirement
  // coverage, evidence readiness, linked material and the next step.
  const linkedResume = application.resume_id
    ? bundle?.resumes.find((resume) => resume.id === application.resume_id)
    : undefined;
  const coverage = evidenceFacts?.coverage ?? null;
  const dueDetail =
    application.next_action && application.next_action_due
      ? `${dueState === 'overdue' ? 'Overdue' : dueState === 'today' ? 'Due today' : 'Upcoming'} · ${application.next_action_due}`
      : undefined;

  const renderProgressStrip = () => (
    <div className="border-b border-border bg-card">
      <ApplicationStageRail stages={railStages} label="Stage progress" />
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 px-4 py-4 sm:px-6 lg:grid-cols-4">
        <Fact
          label="Progress"
          value={
            coverage
              ? coverage.requirementCount > 0
                ? `${coverage.supportedRequirementCount} of ${coverage.requirementCount} requirements supported`
                : 'No requirements recorded'
              : 'Requirements unavailable'
          }
          tone={
            coverage && coverage.requirementCount > 0
              ? coverage.gapRequirementCount === 0
                ? 'success'
                : 'warning'
              : undefined
          }
        />
        <Fact
          label="Evidence"
          value={evidenceFacts ? `${evidenceFacts.readyCount} of ${evidenceFacts.totalCount} ready` : 'Unavailable'}
          tone={evidenceFacts && evidenceFacts.readyCount > 0 ? 'success' : undefined}
        />
        <Fact
          label="Application CV"
          value={
            linkedResume
              ? linkedResume.title || 'Untitled CV'
              : application.resume_id
                ? 'Linked CV'
                : 'Not linked'
          }
        />
        <Fact
          label="Next step"
          value={application.next_action || 'None set'}
          detail={dueDetail}
          tone={dueState === 'overdue' || dueState === 'today' ? 'warning' : undefined}
        />
      </div>
    </div>
  );

  const inspectorTitle = 'Evidence context';
  const inspectorActions = {
    onLinkEvidenceForRequirement: (requirementId: string) =>
      focusControl('requirements', `dossier-link-${requirementId}`),
    onAddRequirement: () => focusControl('requirements', 'dossier-add-requirement'),
    onAddSourceForEvidence: (evidenceId: string) => focusControl('ledger', `dossier-source-${evidenceId}`),
    onConfirmEvidence: (evidenceId: string) => handleConfirmEvidence(evidenceId),
  };

  return (
    <main ref={pageRef} tabIndex={-1} className="space-y-0 focus:outline-none">
      <p aria-live="polite" className="sr-only">
        {inspectorAnnouncement}
      </p>
        <div
          className={
            isCompact
              ? 'grid gap-4 min-w-0'
              : 'grid items-start gap-5 xl:grid-cols-[230px_minmax(0,1fr)_330px] min-w-0'
          }
        >
        {!isCompact && (
          <div className="hidden xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:overscroll-contain">
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
                        id={`dossier-section-tab-${section}`}
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

            {renderProgressStrip()}

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
              <>
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
                <DossierActionBar>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={practiceHref}>
                      <MessageSquare aria-hidden="true" className="h-4 w-4" />
                      Practice interview
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={cvHref}>
                      <FileText aria-hidden="true" className="h-4 w-4" />
                      {application.resume_id ? 'Open CV editor' : 'Prepare CV'}
                    </Link>
                  </Button>
                </DossierActionBar>
              </>
            )}
          </WorkingDocument>
        </div>

        {!isCompact && evidence && (
          <div className="hidden xl:sticky xl:top-4 xl:block xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:overscroll-contain">
            <ApplicationEvidenceInspector data={evidence} selection={inspectorSelection} {...inspectorActions} />
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
              <ApplicationEvidenceInspector data={evidence} selection={inspectorSelection} {...inspectorActions} />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </main>
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

function Fact({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'success' | 'warning';
}) {
  return (
    <div
      className={cn(
        'min-w-0 border-l-2 pl-3',
        tone === 'success' ? 'border-success' : tone === 'warning' ? 'border-warning' : 'border-border',
      )}
    >
      <p className="dossier-eyebrow">{label}</p>
      <p
        className={cn(
          'mt-1 truncate text-sm font-semibold',
          tone === 'success' && 'text-success',
          tone === 'warning' && 'text-warning',
        )}
      >
        {value}
      </p>
      {detail && <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{detail}</p>}
    </div>
  );
}
