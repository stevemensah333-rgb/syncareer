// ── Applications index view-model (Prove hub) ─────────────────────
//
// Pure derivation of what one application object shows on the index:
// opportunity → current stage → next action → evidence/CV state →
// secondary metadata. Every field is derived from a stored row; when a
// fact is not recorded the field is null and the UI omits it rather than
// inventing a value.

import {
  STAGE_LABELS,
  stageForStatus,
  statusLabel,
  terminalOutcomeForStatus,
  type ApplicationStage,
} from './workflow';
import { applicationFacts, nextActionDueState, type DueState, type WorkspaceApplication, type WorkspaceResume } from './workspace';
import { getOrganisation } from '@/features/opportunities/opportunity';
import { buildRequirementThreads, threadCoverage } from '@/features/evidence/dossierViewModel';
import type {
  ApplicationEvidenceLinkRow,
  ApplicationRequirementRow,
  EvidenceItemRow,
  EvidenceSourceRow,
  ResumeEvidenceLinkRow,
} from '@/features/evidence/types';

/** Requirement coverage for one application. Null when no requirements are recorded. */
export interface ApplicationEvidenceState {
  requirementCount: number;
  supportedRequirementCount: number;
  gapRequirementCount: number;
}

export interface ApplicationNextActionState {
  /** What the student should do next. */
  label: string;
  /** True when the student wrote it themselves; false when derived from state. */
  recorded: boolean;
  due: string | null;
  dueState: DueState;
}

export interface ApplicationSummary {
  id: string;
  role: string;
  organisation: string | null;
  location: string | null;
  status: string;
  statusLabel: string;
  stage: ApplicationStage | null;
  stageLabel: string;
  /** ISO timestamp of the tracked application record (the date applied). */
  appliedAt: string;
  /** Last stored change to the record; null when it equals the applied date. */
  lastActivityAt: string | null;
  cvTitle: string | null;
  evidence: ApplicationEvidenceState | null;
  nextAction: ApplicationNextActionState;
  /** The posting row no longer resolves; saved role facts are shown instead. */
  postingMissing: boolean;
}

export interface EvidenceIndexData {
  requirements: ApplicationRequirementRow[];
  links: ApplicationEvidenceLinkRow[];
  items: EvidenceItemRow[];
  sources: EvidenceSourceRow[];
  resumeLinks: ResumeEvidenceLinkRow[];
}

function derivedNextAction(
  status: string,
  evidence: ApplicationEvidenceState | null,
  hasCv: boolean,
): string {
  const terminal = terminalOutcomeForStatus(status);
  if (terminal === 'hired') return 'Record what worked in this application';
  if (terminal) return 'Review your notes and carry the learning forward';
  if (evidence && evidence.gapRequirementCount > 0) return 'Review missing evidence';
  if (evidence === null) return 'Map the role requirements';
  if (!hasCv) return 'Tailor a CV for this application';
  if (status === 'interview') return 'Practise interview answers for this role';
  return 'Confirm your next step in the workspace';
}

function coverageFor(
  applicationId: string,
  evidence: EvidenceIndexData | null,
): ApplicationEvidenceState | null {
  if (!evidence) return null;
  const requirements = evidence.requirements.filter((row) => row.application_id === applicationId);
  if (requirements.length === 0) return null;
  const threads = buildRequirementThreads(
    requirements,
    evidence.links,
    evidence.items,
    evidence.sources,
    evidence.resumeLinks,
  );
  return threadCoverage(threads);
}

/**
 * Build the index objects. `evidence` is null when the evidence relations
 * could not be read; coverage is then omitted instead of shown as zero.
 */
export function buildApplicationSummaries(
  applications: WorkspaceApplication[],
  resumes: WorkspaceResume[],
  evidence: EvidenceIndexData | null,
  now = new Date(),
): ApplicationSummary[] {
  const resumeTitles = new Map(resumes.map((resume) => [resume.id, resume.title]));

  return applications.map((application) => {
    const facts = applicationFacts(application);
    const stage = stageForStatus(application.status);
    const coverage = coverageFor(application.id, evidence);
    const cvTitle = application.resume_id
      ? (resumeTitles.get(application.resume_id)?.trim() || 'Application CV')
      : null;
    const recorded = application.next_action?.trim() ?? '';

    return {
      id: application.id,
      role: facts.title?.trim() || 'Tracked application',
      organisation: getOrganisation(facts),
      location: facts.location?.trim() || null,
      status: application.status,
      statusLabel: statusLabel(application.status),
      stage,
      stageLabel: stage ? STAGE_LABELS[stage] : statusLabel(application.status),
      appliedAt: application.created_at,
      lastActivityAt:
        application.updated_at && application.updated_at !== application.created_at
          ? application.updated_at
          : null,
      cvTitle,
      evidence: coverage,
      nextAction: {
        label: recorded || derivedNextAction(application.status, coverage, Boolean(cvTitle)),
        recorded: Boolean(recorded),
        due: recorded ? application.next_action_due : null,
        dueState: nextActionDueState(application.next_action, application.next_action_due, now),
      },
      postingMissing: application.job === null,
    };
  });
}

// ── Filtering ─────────────────────────────────────────────────────
//
// Four states the student actually recognises. Interview is separated from
// the rest of the active pipeline because it is the stage that changes what
// they do next.

export type ApplicationFilter = 'all' | 'in-progress' | 'interview' | 'completed';

export const APPLICATION_FILTER_LABELS: Record<ApplicationFilter, string> = {
  all: 'All',
  'in-progress': 'In progress',
  interview: 'Interview',
  completed: 'Completed',
};

export function parseApplicationFilter(value: string | null): ApplicationFilter {
  return value === 'in-progress' || value === 'interview' || value === 'completed' ? value : 'all';
}

export function filterOf(summary: ApplicationSummary): Exclude<ApplicationFilter, 'all'> {
  if (summary.stage === 'interview') return 'interview';
  if (terminalOutcomeForStatus(summary.status)) return 'completed';
  return 'in-progress';
}

export function matchesFilter(summary: ApplicationSummary, filter: ApplicationFilter): boolean {
  return filter === 'all' || filterOf(summary) === filter;
}

export function matchesSearch(summary: ApplicationSummary, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) return true;
  return `${summary.role} ${summary.organisation ?? ''} ${summary.nextAction.label}`
    .toLowerCase()
    .includes(query);
}

export interface FilterOption {
  value: ApplicationFilter;
  label: string;
  count: number;
}

/**
 * Filter options for the current records. A state filter is offered only
 * when at least one application is in that state.
 */
export function filterOptions(summaries: ApplicationSummary[]): FilterOption[] {
  const counts: Record<Exclude<ApplicationFilter, 'all'>, number> = {
    'in-progress': 0,
    interview: 0,
    completed: 0,
  };
  for (const summary of summaries) counts[filterOf(summary)] += 1;

  const options: FilterOption[] = [
    { value: 'all', label: APPLICATION_FILTER_LABELS.all, count: summaries.length },
  ];
  for (const value of ['in-progress', 'interview', 'completed'] as const) {
    if (counts[value] > 0) {
      options.push({ value, label: APPLICATION_FILTER_LABELS[value], count: counts[value] });
    }
  }
  return options;
}

// ── Lower region: only what the stored records support ─────────────

/**
 * Applications that need the student to act: an overdue/due-today recorded
 * action, or an active application with unsupported requirements.
 */
export function needsAttention(summaries: ApplicationSummary[]): ApplicationSummary[] {
  return summaries.filter((summary) => {
    if (filterOf(summary) === 'completed') return false;
    if (summary.nextAction.dueState === 'overdue' || summary.nextAction.dueState === 'today') return true;
    return Boolean(summary.evidence && summary.evidence.gapRequirementCount > 0);
  });
}

/** Applications with a stored change after the application was created, newest first. */
export function recentActivity(summaries: ApplicationSummary[], limit = 4): ApplicationSummary[] {
  return summaries
    .filter((summary) => summary.lastActivityAt !== null)
    .sort((a, b) => (b.lastActivityAt ?? '').localeCompare(a.lastActivityAt ?? ''))
    .slice(0, limit);
}
