import type { RequirementThread } from '@/features/evidence/dossierViewModel';
import type { ResumeEvidenceLinkRow } from '@/features/evidence/types';
import type { DueState } from '@/features/application-tracker/workspace';

/**
 * The dossier's spine, expressed as data:
 *
 *   job requirement → your evidence → application material → next action
 *
 * Every fact returned here comes from rows the dossier already loaded (the
 * requirement thread, CV usage links, the linked application CV, the stored
 * next action). Where a link does not exist the derivation says so instead of
 * inventing one, so the workspace can never claim support the student has not
 * provided.
 */

export type RequirementFlowStatus =
  | 'no_evidence'
  | 'needs_source'
  | 'ready_not_used'
  | 'in_cv'
  | 'covered';

export type RequirementNextActionKind = 'link_evidence' | 'add_source' | 'open_cv' | 'practice' | 'none';

export interface RequirementMaterialFact {
  kind: 'cv' | 'interview';
  label: string;
  detail: string | null;
}

export interface RequirementFlow {
  status: RequirementFlowStatus;
  attachedCount: number;
  supportedCount: number;
  /** Plain statement of what is missing, or null when nothing is missing. */
  gap: string | null;
  materials: RequirementMaterialFact[];
  nextAction: { kind: RequirementNextActionKind; label: string };
}

export interface RequirementFlowInput {
  /** CV usage links grouped by evidence id; the only proof of CV placement. */
  cvLinksByEvidence: Map<string, ResumeEvidenceLinkRow[]>;
  /** The application's linked CV, when one exists. */
  applicationCvId: string | null;
  applicationCvTitle: string | null;
}

const CV_SECTION_LABELS: Record<ResumeEvidenceLinkRow['cv_section'], string> = {
  experience: 'Experience',
  projects: 'Projects',
  activities: 'Activities',
  education: 'Education',
  achievements: 'Achievements',
  skills: 'Skills',
};

export function groupCvLinksByEvidence(links: ResumeEvidenceLinkRow[]): Map<string, ResumeEvidenceLinkRow[]> {
  const grouped = new Map<string, ResumeEvidenceLinkRow[]>();
  for (const link of links) {
    const existing = grouped.get(link.evidence_id);
    if (existing) existing.push(link);
    else grouped.set(link.evidence_id, [link]);
  }
  return grouped;
}

/**
 * Reads one requirement thread as the four-step flow. `usedInCv` and
 * `usedInInterview` are already derived from stored links by the thread view
 * model; this function only decides what the student should do next.
 */
export function describeRequirementFlow(
  thread: RequirementThread,
  { cvLinksByEvidence, applicationCvId, applicationCvTitle }: RequirementFlowInput,
): RequirementFlow {
  const entries = thread.evidence;
  const supportedCount = entries.filter((entry) => entry.supportStatus === 'supported').length;
  const hasSupported = supportedCount > 0;

  const materials: RequirementMaterialFact[] = [];
  const seen = new Set<string>();
  const pushMaterial = (fact: RequirementMaterialFact) => {
    const key = `${fact.kind}:${fact.label}:${fact.detail ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    materials.push(fact);
  };

  for (const entry of entries) {
    if (!entry.usedInCv) continue;
    const links = cvLinksByEvidence.get(entry.item.id) ?? [];
    if (links.length === 0) {
      pushMaterial({ kind: 'cv', label: 'Application CV', detail: null });
      continue;
    }
    for (const link of links) {
      const isApplicationCv = applicationCvId !== null && link.resume_id === applicationCvId;
      pushMaterial({
        kind: 'cv',
        label: isApplicationCv ? (applicationCvTitle || 'Application CV') : 'CV',
        detail: link.entry_locator
          ? `${CV_SECTION_LABELS[link.cv_section]} · ${link.entry_locator}`
          : CV_SECTION_LABELS[link.cv_section],
      });
    }
  }
  if (entries.some((entry) => entry.usedInInterview)) {
    pushMaterial({ kind: 'interview', label: 'Interview practice', detail: null });
  }

  const inCv = materials.some((material) => material.kind === 'cv');
  const inInterview = materials.some((material) => material.kind === 'interview');

  let status: RequirementFlowStatus;
  if (entries.length === 0) status = 'no_evidence';
  else if (!hasSupported) status = 'needs_source';
  else if (!inCv) status = 'ready_not_used';
  else if (!inInterview) status = 'in_cv';
  else status = 'covered';

  const gap =
    status === 'no_evidence'
      ? 'No evidence answers this requirement yet.'
      : status === 'needs_source'
        ? `${entries.length} ${entries.length === 1 ? 'item' : 'items'} attached, none backed by a source.`
        : status === 'ready_not_used'
          ? 'Supported evidence is not used in any application material yet.'
          : null;

  const nextAction =
    status === 'no_evidence'
      ? { kind: 'link_evidence' as const, label: 'Link evidence' }
      : status === 'needs_source'
        ? { kind: 'add_source' as const, label: 'Add a source' }
        : status === 'ready_not_used'
          ? { kind: 'open_cv' as const, label: applicationCvId ? 'Use it in the application CV' : 'Prepare the application CV' }
          : status === 'in_cv'
            ? { kind: 'practice' as const, label: 'Practice this in interview prep' }
            : { kind: 'none' as const, label: 'Nothing outstanding' };

  return {
    status,
    attachedCount: entries.length,
    supportedCount,
    gap,
    materials,
    nextAction,
  };
}

export type FlowTone = 'neutral' | 'success' | 'warning';

export interface FlowFact {
  value: string;
  tone: FlowTone;
}

/**
 * The application's CV as the dossier can actually see it: linked and loaded,
 * absent, or linked but unreadable because the CV rows failed to load. A
 * missing row is never presented as "no CV".
 */
export type ApplicationCvFact =
  | { state: 'linked'; label: string }
  | { state: 'none' }
  | { state: 'unavailable' };

export interface ApplicationFlowInput {
  /** Null when evidence rows could not be loaded at all. */
  requirementCount: number | null;
  supportedRequirementCount: number;
  gapRequirementCount: number;
  evidenceReady: number;
  evidenceTotal: number;
  applicationCv: ApplicationCvFact;
  nextActionLabel: string | null;
  nextActionDue: string | null;
  dueState: DueState;
}

const DUE_LABELS: Record<Exclude<DueState, 'none'>, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  upcoming: 'Due',
};

/**
 * The same four steps as a page-level summary, so the relationship is legible
 * before the student reads a single requirement.
 */
export function describeApplicationFlow(input: ApplicationFlowInput): Record<FlowStepId, FlowFact> {
  const requirement: FlowFact =
    input.requirementCount === null
      ? { value: 'Requirements unavailable', tone: 'neutral' }
      : input.requirementCount === 0
        ? { value: 'No requirements recorded', tone: 'warning' }
        : input.gapRequirementCount === 0
          ? { value: `${input.supportedRequirementCount} of ${input.requirementCount} supported`, tone: 'success' }
          : {
              value: `${input.supportedRequirementCount} of ${input.requirementCount} supported`,
              tone: 'warning',
            };

  const evidence: FlowFact =
    input.requirementCount === null
      ? { value: 'Evidence unavailable', tone: 'neutral' }
      : input.evidenceTotal === 0
        ? { value: 'No evidence saved yet', tone: 'warning' }
        : input.evidenceReady === 0
          ? { value: `${input.evidenceTotal} saved, none ready`, tone: 'warning' }
          : { value: `${input.evidenceReady} of ${input.evidenceTotal} ready`, tone: 'success' };

  const material: FlowFact =
    input.applicationCv.state === 'linked'
      ? { value: input.applicationCv.label, tone: 'success' }
      : input.applicationCv.state === 'unavailable'
        ? { value: 'Linked CV could not be loaded', tone: 'neutral' }
        : { value: 'No application CV linked', tone: 'warning' };

  const dueLabel =
    input.nextActionDue && input.dueState !== 'none'
      ? `${DUE_LABELS[input.dueState]} · ${input.nextActionDue}`
      : null;
  const action: FlowFact = !input.nextActionLabel
    ? { value: 'No next action set', tone: 'warning' }
    : {
        value: dueLabel ? `${input.nextActionLabel} · ${dueLabel}` : input.nextActionLabel,
        tone: input.dueState === 'overdue' || input.dueState === 'today' ? 'warning' : 'neutral',
      };

  return { requirement, evidence, material, action };
}

export type FlowStepId = 'requirement' | 'evidence' | 'material' | 'action';

/** Section ids the dossier document owns. The flow steps point into them. */
export const DOSSIER_SECTIONS = ['brief', 'progress', 'requirements', 'ledger', 'cv', 'interview', 'mentor'] as const;
export type DossierSectionId = (typeof DOSSIER_SECTIONS)[number];

export const FLOW_STEPS: Array<{ id: FlowStepId; label: string; section: DossierSectionId }> = [
  { id: 'requirement', label: 'Job requirement', section: 'requirements' },
  { id: 'evidence', label: 'Your evidence', section: 'ledger' },
  { id: 'material', label: 'Application material', section: 'cv' },
  { id: 'action', label: 'Next action', section: 'progress' },
];

/** Which step the current inspector selection is talking about. */
export function flowStepForSelection(selectionKind: 'requirement' | 'evidence' | null): FlowStepId | null {
  if (selectionKind === 'requirement') return 'requirement';
  if (selectionKind === 'evidence') return 'evidence';
  return null;
}

/** Which step a section of the document belongs to. */
export function flowStepForSection(sectionId: DossierSectionId): FlowStepId | null {
  return FLOW_STEPS.find((step) => step.section === sectionId)?.id ?? null;
}
