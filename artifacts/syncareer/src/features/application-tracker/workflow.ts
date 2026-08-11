// ── Canonical application workflow vocabulary ─────────────────────
//
// Single source of truth for the student-facing application status model.
// The Home/dashboard helpers in `components/dashboard/home/utils.ts`
// re-export from this module; the tracker page and the opportunity
// workspace consume it directly. Keep display conventions consistent by
// changing them here only.
//
// Storage reality: `job_applications.status` is an unconstrained text
// column written through Lovable Cloud, so every helper here tolerates
// unknown stored statuses instead of crashing on partial/legacy data.

export type ApplicationStatus =
  | 'pending'
  | 'reviewing'
  | 'shortlisted'
  | 'interview'
  | 'offered'
  | 'hired'
  | 'rejected'
  | 'withdrawn'
  | string;

/** Minimal reference to a tracked application row, as used by list/detail UIs. */
export interface ApplicationRef {
  id: string;
  status: string;
}

export const ACTIVE_STATUSES: ApplicationStatus[] = [
  'pending',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
];

export const ORDERED_STATUSES: ApplicationStatus[] = [
  'pending',
  'reviewing',
  'shortlisted',
  'interview',
  'offered',
  'hired',
];

export const STATUS_LABELS: Record<string, string> = {
  pending: 'Applied',
  reviewing: 'Under review',
  shortlisted: 'Shortlisted',
  interview: 'Interview',
  offered: 'Offered',
  hired: 'Hired',
  rejected: 'Closed',
  withdrawn: 'Withdrawn',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status.charAt(0).toUpperCase() + status.slice(1);
}

export function isActiveStatus(status: string): boolean {
  return ACTIVE_STATUSES.includes(status);
}

// ── Status journey ────────────────────────────────────────────────
//
// The stored statuses are user-reported tracking values. For display we
// group them into a small, meaningful journey instead of many decorative
// stages. A tracker row only ever exists after the user applied, so
// "Applied" is always factually completed.
//
//   Applied → In review → Interview → Offer → Outcome
//
// Outcome is terminal: hired (success), rejected/closed, or withdrawn.

export type ApplicationStage = 'applied' | 'review' | 'interview' | 'offer' | 'outcome';

export const STAGE_ORDER: ApplicationStage[] = ['applied', 'review', 'interview', 'offer', 'outcome'];

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: 'Applied',
  review: 'In review',
  interview: 'Interview',
  offer: 'Offer',
  outcome: 'Outcome',
};

const STATUS_TO_STAGE: Record<string, ApplicationStage> = {
  pending: 'applied',
  reviewing: 'review',
  shortlisted: 'review',
  interview: 'interview',
  offered: 'offer',
  hired: 'outcome',
  rejected: 'outcome',
  withdrawn: 'outcome',
};

/** Map a stored status to its journey stage. Unknown stored values return null. */
export function stageForStatus(status: string): ApplicationStage | null {
  return STATUS_TO_STAGE[status] ?? null;
}

/** Statuses that belong to a journey stage (used by stage filters). */
export function statusesForStage(stage: ApplicationStage): ApplicationStatus[] {
  switch (stage) {
    case 'applied':
      return ['pending'];
    case 'review':
      return ['reviewing', 'shortlisted'];
    case 'interview':
      return ['interview'];
    case 'offer':
      return ['offered'];
    case 'outcome':
      return ['hired', 'rejected', 'withdrawn'];
  }
}

export type TerminalOutcome = 'hired' | 'rejected' | 'withdrawn';

/** Terminal outcome for a status, or null for active/unknown statuses. */
export function terminalOutcomeForStatus(status: string): TerminalOutcome | null {
  if (status === 'hired' || status === 'rejected' || status === 'withdrawn') return status;
  return null;
}

export type JourneyStepState = 'done' | 'current' | 'upcoming' | 'unrecorded';

export interface JourneyStep {
  stage: ApplicationStage;
  label: string;
  state: JourneyStepState;
}

export interface ApplicationJourney {
  steps: JourneyStep[];
  /** Set when the stored status is a terminal outcome. */
  terminal: TerminalOutcome | null;
  /** True when the stored status is not part of the known vocabulary. */
  unknownStatus: boolean;
}

/**
 * Build the journey view-model for a stored status.
 *
 * Honesty rules:
 * - "Applied" is always done (a tracker row implies the user applied).
 * - For terminal outcomes the middle stages are marked `unrecorded`
 *   because we only store the current status, not a stage history — we do
 *   not fabricate a timeline.
 * - Unknown statuses yield an `unknownStatus` flag so the UI can show a
 *   partial-data hint instead of guessing a stage.
 */
export function buildJourney(status: string): ApplicationJourney {
  const stage = stageForStatus(status);
  if (!stage) {
    return {
      steps: STAGE_ORDER.map((s) => ({ stage: s, label: STAGE_LABELS[s], state: 'upcoming' })),
      terminal: null,
      unknownStatus: true,
    };
  }

  const terminal = terminalOutcomeForStatus(status);
  const currentIdx = STAGE_ORDER.indexOf(stage);

  const steps: JourneyStep[] = STAGE_ORDER.map((s, idx) => {
    let state: JourneyStepState;
    if (terminal) {
      if (s === 'applied') state = 'done';
      else if (s === stage) state = 'current';
      else state = 'unrecorded';
    } else if (idx < currentIdx) {
      state = 'done';
    } else if (idx === currentIdx) {
      state = 'current';
    } else {
      state = 'upcoming';
    }
    // The outcome step reflects the actual recorded outcome.
    const label =
      s === 'outcome' && terminal
        ? terminal === 'hired'
          ? 'Hired'
          : terminal === 'rejected'
            ? 'Not selected'
            : 'Withdrawn'
        : STAGE_LABELS[s];
    return { stage: s, label, state };
  });

  return { steps, terminal, unknownStatus: false };
}

// ── Status editor ─────────────────────────────────────────────────
//
// The student reporting flow offers the known vocabulary in two groups:
// progress updates and terminal outcome recording. Outcome recording is
// what feeds the recommendation feedback loop (STATUS_OUTCOME_MAP).

export interface StatusOption {
  value: ApplicationStatus;
  label: string;
  description: string;
}

export interface StatusEditorGroup {
  id: 'progress' | 'outcome';
  label: string;
  options: StatusOption[];
}

export const STATUS_EDITOR_GROUPS: StatusEditorGroup[] = [
  {
    id: 'progress',
    label: 'Update progress',
    options: [
      { value: 'pending', label: STATUS_LABELS['pending'] ?? 'Applied', description: 'You applied and are waiting to hear back.' },
      { value: 'reviewing', label: STATUS_LABELS['reviewing'] ?? 'Under review', description: 'The employer is reviewing your application.' },
      { value: 'shortlisted', label: STATUS_LABELS['shortlisted'] ?? 'Shortlisted', description: 'You made a shortlist for the next step.' },
      { value: 'interview', label: STATUS_LABELS['interview'] ?? 'Interview', description: 'You are in an interview process.' },
      { value: 'offered', label: STATUS_LABELS['offered'] ?? 'Offered', description: 'You received an offer.' },
    ],
  },
  {
    id: 'outcome',
    label: 'Record outcome',
    options: [
      { value: 'hired', label: STATUS_LABELS['hired'] ?? 'Hired', description: 'You accepted or started the role.' },
      { value: 'rejected', label: 'Not selected', description: 'The employer declined, or the process ended.' },
      { value: 'withdrawn', label: STATUS_LABELS['withdrawn'] ?? 'Withdrawn', description: 'You withdrew your application.' },
    ],
  },
];

const KNOWN_STATUSES = new Set([
  ...STATUS_EDITOR_GROUPS.flatMap((g) => g.options.map((o) => o.value)),
]);

/** A status can be recorded when it is known vocabulary and not the current value. */
export function canRecordStatus(current: string, target: string): boolean {
  return KNOWN_STATUSES.has(target) && target !== current;
}

// ── Notes ─────────────────────────────────────────────────────────

/**
 * Normalize notes for storage: trimmed, empty → null (invariant: no empty
 * strings where the column expects null). Notes longer than the safety cap
 * are truncated client-side; the column itself is unbounded text.
 */
export const APPLICATION_NOTES_MAX = 2000;

export function normalizeApplicationNotes(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, APPLICATION_NOTES_MAX);
}

// ── Next recommended action ───────────────────────────────────────

export interface NextStepForStatus {
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
}

/**
 * Baseline next-step copy per status (no deadline/CV/deletion context).
 * Used by the Home journey; the tracker detail view uses
 * `getApplicationNextAction`, which extends this with more context.
 */
export function nextStepForApplicationStatus(
  status: string,
  jobTitle: string
): NextStepForStatus {
  const role = jobTitle || 'this role';
  switch (status) {
    case 'pending':
      return {
        title: 'Application under review',
        description: `Your application for ${role} has been received. Use this time to tailor your CV for similar roles or practise interview questions for ${role}.`,
        ctaLabel: 'Practise interview',
        href: '/interview-simulator',
      };
    case 'reviewing':
      return {
        title: 'Recruiter is reviewing',
        description: `The team is reviewing your application for ${role}. Prepare for the next stage by rehearsing role-specific answers.`,
        ctaLabel: 'Prepare for interview',
        href: '/practice',
      };
    case 'shortlisted':
      return {
        title: 'You have been shortlisted',
        description: `Great progress on ${role}. Focus your next hour on interview practice and refining your key stories.`,
        ctaLabel: 'Practise interview',
        href: `/interview-simulator?role=${encodeURIComponent(role)}`,
      };
    case 'interview':
      return {
        title: 'Interview stage',
        description: `You're in interviews for ${role}. Run a mock interview and review your CV alignment with the posting.`,
        ctaLabel: 'Run mock interview',
        href: `/interview-simulator?role=${encodeURIComponent(role)}`,
      };
    case 'offered':
      return {
        title: 'Offer received',
        description: `You have an offer for ${role}. When you're ready, record the outcome so your tracker stays accurate.`,
        ctaLabel: 'Record outcome',
        href: '/applications',
      };
    case 'hired':
      return {
        title: 'Hired — congratulations',
        description: `Your application for ${role} is marked as hired. Keep your CV updated for future opportunities.`,
        ctaLabel: 'Update CV',
        href: '/cv-builder',
      };
    case 'rejected':
      return {
        title: 'Application closed',
        description: `Your application for ${role} has been closed. Review feedback if available and apply your learnings to the next role.`,
        ctaLabel: 'Find new roles',
        href: '/opportunities',
      };
    case 'withdrawn':
      return {
        title: 'Application withdrawn',
        description: `You withdrew from ${role}. Your other applications are still active.`,
        ctaLabel: 'Browse opportunities',
        href: '/opportunities',
      };
    default:
      return {
        title: 'Keep momentum',
        description: `Stay active on ${role} — review the posting, improve your CV, and practise key interview answers.`,
        ctaLabel: 'Open tracker',
        href: '/applications',
      };
  }
}

export type ApplicationNextActionKind = 'link' | 'record-outcome' | 'info';

export interface ApplicationNextAction {
  kind: ApplicationNextActionKind;
  title: string;
  description: string;
  /** Internal route for `kind: 'link'`. */
  href?: string;
  ctaLabel?: string;
}

export interface ApplicationNextActionInput {
  status: string;
  /** Null/empty when the related posting is missing or untitled. */
  jobTitle: string | null;
  /** True when the joined job_postings row is unavailable (e.g. deleted). */
  jobMissing: boolean;
  /** True when the posting listed a deadline that has passed. */
  deadlinePassed: boolean;
  /** Whether the user has a saved CV; null = unknown (still loading). */
  hasCv: boolean | null;
  /** Skills from the posting, for interview-practice deep links. */
  skills?: string[] | null;
}

function roleQuery(role: string, skills?: string[] | null): string {
  const params = new URLSearchParams({ role });
  if (skills && skills.length > 0) params.set('skills', skills.join(','));
  return params.toString();
}

/**
 * Context-aware next action for the tracker detail view. Falls back to the
 * baseline per-status step; adds explicit handling for expired deadlines,
 * missing postings, and missing CVs so the recommendation never pretends
 * information exists when it does not.
 */
export function getApplicationNextAction(input: ApplicationNextActionInput): ApplicationNextAction {
  const role = input.jobTitle?.trim() || 'this role';

  if (input.jobMissing) {
    return {
      kind: 'info',
      title: 'Original posting unavailable',
      description:
        'The listing this application refers to is no longer available, so role details and deadlines cannot be shown. Your record, status, and notes are preserved — keep tracking the outcome here.',
    };
  }

  const terminal = terminalOutcomeForStatus(input.status);
  if (terminal === 'hired') {
    return {
      kind: 'link',
      title: 'Hired — congratulations',
      description: 'Your outcome is recorded and feeds your recommendation feedback. Keep your CV updated for future opportunities.',
      href: '/cv-builder',
      ctaLabel: 'Update CV',
    };
  }
  if (terminal === 'rejected' || terminal === 'withdrawn') {
    return {
      kind: 'link',
      title: terminal === 'rejected' ? 'Application closed' : 'Application withdrawn',
      description:
        'This outcome is recorded. Review your notes on this application, then put the learning into the next one.',
      href: '/opportunities',
      ctaLabel: 'Browse opportunities',
    };
  }

  if (input.deadlinePassed && input.status === 'pending') {
    return {
      kind: 'info',
      title: 'Listed deadline has passed',
      description: `The deadline shown on the posting for ${role} has passed. If you have heard back, update the status below; otherwise confirm on the original listing whether applications are still open.`,
    };
  }

  if (input.status === 'pending' && input.hasCv === false) {
    return {
      kind: 'link',
      title: 'No CV saved yet',
      description: `You have not saved a CV to tailor for ${role}. Create one so you can respond quickly if the employer replies, and reuse it for similar roles.`,
      href: `/cv-builder?targetRole=${encodeURIComponent(role)}`,
      ctaLabel: 'Create my CV',
    };
  }

  if (input.status === 'offered') {
    return {
      kind: 'record-outcome',
      title: 'Offer received',
      description: `You have an offer for ${role}. Record the outcome below (accepted or declined) so your tracker and recommendations stay accurate.`,
    };
  }

  const base = nextStepForApplicationStatus(input.status, role);
  if (base.href.startsWith('/interview-simulator') && input.skills && input.skills.length > 0) {
    return { kind: 'link', title: base.title, description: base.description, href: `/interview-simulator?${roleQuery(role, input.skills)}`, ctaLabel: base.ctaLabel };
  }
  return { kind: 'link', title: base.title, description: base.description, href: base.href, ctaLabel: base.ctaLabel };
}
