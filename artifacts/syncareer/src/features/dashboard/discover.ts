// ── Discover-mode dashboard model ─────────────────────────────────
//
// Pure view-model logic for the student home in DISCOVER mode. No React,
// no Supabase IO. Everything here is derived ONLY from data that actually
// exists for the user — assessment direction, tracked applications, saved
// opportunities, the deterministic CV completion score, and recorded
// interview practice. Nothing is fabricated: where a signal is absent the
// model returns an explicit "not started" state instead of inventing one.

import {
  applicationCompany,
  applicationTitle,
  selectPrimaryFocus,
  type DashboardApplication,
  type DashboardSavedJob,
} from './continuation';
import { isActiveStatus, statusLabel } from '@/features/application-tracker/workflow';

// ── Inputs ────────────────────────────────────────────────────────

/** Top RIASEC interest labels recorded by the assessment (never inferred). */
export interface CareerDirection {
  primary: string | null;
  secondary: string | null;
  tertiary: string | null;
}

/** Recorded mock-interview practice. Scores are intentionally omitted —
 *  interview feedback is LLM output and is not treated as a metric. */
export interface InterviewPractice {
  total: number;
  lastRole: string | null;
  lastAt: string | null;
}

export interface DiscoverSnapshot {
  fullName: string | null;
  major: string | null;
  school: string | null;
  assessmentDone: boolean;
  direction: CareerDirection | null;
  applications: DashboardApplication[];
  savedJobs: DashboardSavedJob[];
  /** Deterministic CV completion (0–100) from the CV builder. */
  cvCompletion: number;
  interview: InterviewPractice;
}

// ── Derived helpers ───────────────────────────────────────────────

export function timeOfDayGreeting(now = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string | null | undefined): string | null {
  const name = fullName?.trim().split(/\s+/)[0];
  return name ? name : null;
}

/** A direction is "known" when the student has a declared major or a
 *  completed assessment — the two real sources of career direction. */
export function hasDirection(snapshot: DiscoverSnapshot): boolean {
  return Boolean(snapshot.major?.trim()) || snapshot.assessmentDone;
}

function activeApplications(applications: DashboardApplication[]): DashboardApplication[] {
  return applications.filter((application) => isActiveStatus(application.status));
}

function undecidedSaved(
  applications: DashboardApplication[],
  savedJobs: DashboardSavedJob[],
): DashboardSavedJob[] {
  const tracked = new Set(
    applications.map((application) => application.job?.id).filter((id): id is string => Boolean(id)),
  );
  return savedJobs.filter((saved) => saved.job && !tracked.has(saved.job_id));
}

// ── Next move (the hero decision) ─────────────────────────────────

export type NextMoveKind =
  | 'interview'
  | 'cv'
  | 'application'
  | 'opportunity'
  | 'assessment'
  | 'saved';

export interface NextMove {
  phase: PhaseKey;
  kind: NextMoveKind;
  /** The contextual task headline. */
  task: string;
  /** Optional supporting context (role · organisation). */
  context: string | null;
  /** Short, honest explanation of why this is the highest-value next step. */
  why: string;
  ctaLabel: string;
  href: string;
}

/**
 * Selects the single most valuable next step. Deterministic and honest:
 * it reuses the tracker's primary-focus selection, then chooses the action
 * that best advances that focus given the CV and interview signals we hold.
 * It never claims progress the data does not support.
 */
export function selectNextMove(snapshot: DiscoverSnapshot, now = new Date()): NextMove {
  const focus = selectPrimaryFocus(snapshot.applications, snapshot.savedJobs, now);

  if (focus.type === 'application') {
    const app = focus.data;
    const role = applicationTitle(app);
    const company = applicationCompany(app);
    const context = company ? `${role} · ${company}` : role;

    if (app.status === 'interview' || app.status === 'shortlisted') {
      return {
        phase: 'advance',
        kind: 'interview',
        task: `Prepare for your ${role} interview`,
        context,
        why: 'Interviews are where offers are decided. Rehearsing your answers now compounds every step you have already taken on this application.',
        ctaLabel: 'Practise interview',
        href: `/interview-simulator?application=${encodeURIComponent(app.id)}&role=${encodeURIComponent(role)}`,
      };
    }

    if (app.status === 'offered') {
      return {
        phase: 'advance',
        kind: 'application',
        task: `Record the outcome for ${role}`,
        context,
        why: 'You have an offer on the table. Recording what happens next keeps your tracker accurate and sharpens future recommendations.',
        ctaLabel: 'Open application',
        href: `/applications?application=${encodeURIComponent(app.id)}`,
      };
    }

    // Active but pre-interview (pending / reviewing).
    if (snapshot.cvCompletion < 100) {
      const started = snapshot.cvCompletion > 0;
      return {
        phase: 'prove',
        kind: 'cv',
        task: started ? `Strengthen your CV for ${role}` : `Build a CV for ${role}`,
        context,
        why: 'A tailored CV is the evidence this application rests on — it is the difference between being screened out and moving forward.',
        ctaLabel: started ? 'Review CV' : 'Build CV',
        href: `/cv-builder?application=${encodeURIComponent(app.id)}&targetRole=${encodeURIComponent(role)}`,
      };
    }

    return {
      phase: 'advance',
      kind: 'interview',
      task: `Practise for the ${role} process`,
      context,
      why: 'Your application is in. While you wait to hear back, rehearsing interview answers keeps you ready the moment they reply.',
      ctaLabel: 'Practise interview',
      href: `/interview-simulator?application=${encodeURIComponent(app.id)}&role=${encodeURIComponent(role)}`,
    };
  }

  if (focus.type === 'saved') {
    const job = focus.data.job!;
    return {
      phase: 'discover',
      kind: 'saved',
      task: `Decide on ${job.title}`,
      context: job.company_name?.trim() || null,
      why: 'You saved this opportunity. Reviewing its requirements now tells you whether it is worth a full application before a deadline passes.',
      ctaLabel: 'Review opportunity',
      href: `/opportunities?job=${encodeURIComponent(focus.data.job_id)}`,
    };
  }

  // Nothing in flight yet.
  if (!hasDirection(snapshot)) {
    return {
      phase: 'discover',
      kind: 'assessment',
      task: 'Find your career direction',
      context: null,
      why: 'A short interest check points you toward the role families worth exploring — so your search starts with focus instead of guesswork.',
      ctaLabel: 'Start assessment',
      href: '/assessment',
    };
  }

  const focusLine = snapshot.major?.trim()
    ? `Roles related to ${snapshot.major.trim()}`
    : snapshot.direction?.primary
      ? `${snapshot.direction.primary} roles`
      : null;

  return {
    phase: 'discover',
    kind: 'opportunity',
    task: 'Find an opportunity to pursue',
    context: focusLine,
    why: 'Everything else — your CV, your interview prep — builds on a real opportunity. Choosing one turns preparation into progress.',
    ctaLabel: 'Browse opportunities',
    href: '/opportunities',
  };
}

// ── Career progression: Discover → Prove → Advance ────────────────

export type PhaseKey = 'discover' | 'prove' | 'advance';
export type PhaseStatus = 'todo' | 'in-progress' | 'active';

export interface JourneyPhase {
  key: PhaseKey;
  title: string;
  /** What this phase is for, in plain language. */
  summary: string;
  /** A state label derived strictly from real data. */
  state: string;
  status: PhaseStatus;
  /** 0–100 where a real measure exists (Prove uses CV completion); else null. */
  progress: number | null;
  /** True for the phase the student's attention should be on right now. */
  current: boolean;
  href: string;
}

/**
 * Builds the three-phase progression from real signals only.
 * The `current` phase is aligned to the selected next move so the
 * progression and the hero always agree on where attention belongs.
 */
export function buildCareerJourney(
  snapshot: DiscoverSnapshot,
  nextMove: NextMove,
): JourneyPhase[] {
  const active = activeApplications(snapshot.applications);
  const decidable = undecidedSaved(snapshot.applications, snapshot.savedJobs);
  const totalApplications = snapshot.applications.length;
  const interviewStage = active.filter(
    (a) => a.status === 'interview' || a.status === 'shortlisted',
  ).length;
  const offerStage = active.filter((a) => a.status === 'offered').length;

  // DISCOVER — opportunity discovery.
  const discover: JourneyPhase = (() => {
    if (decidable.length > 0) {
      return phase('discover', 'Discover', 'Find opportunities that fit you', `${decidable.length} saved to review`, 'active');
    }
    if (totalApplications > 0) {
      return phase('discover', 'Discover', 'Find opportunities that fit you', 'Pursuing roles', 'active');
    }
    if (hasDirection(snapshot)) {
      const label = snapshot.direction?.primary ? `Direction: ${snapshot.direction.primary}` : 'Direction set';
      return phase('discover', 'Discover', 'Find opportunities that fit you', label, 'in-progress');
    }
    return phase('discover', 'Discover', 'Find opportunities that fit you', 'Not started', 'todo');
  })();

  // PROVE — evidence and application readiness.
  const prove: JourneyPhase = (() => {
    const state =
      totalApplications > 0
        ? snapshot.cvCompletion > 0
          ? `${totalApplications} tracked · CV ${snapshot.cvCompletion}%`
          : `${totalApplications} tracked · CV not started`
        : snapshot.cvCompletion > 0
          ? `CV ${snapshot.cvCompletion}% ready`
          : 'Not started';
    const status: PhaseStatus =
      totalApplications > 0 ? 'active' : snapshot.cvCompletion > 0 ? 'in-progress' : 'todo';
    return {
      ...phase('prove', 'Prove', 'Build evidence and apply', state, status),
      progress: snapshot.cvCompletion > 0 ? snapshot.cvCompletion : null,
      href: '/build',
    };
  })();

  // ADVANCE — interview readiness and outcomes.
  const advance: JourneyPhase = (() => {
    if (offerStage > 0) {
      return phase('advance', 'Advance', 'Prepare, interview, and decide', 'Offer stage', 'active');
    }
    if (interviewStage > 0) {
      return phase('advance', 'Advance', 'Prepare, interview, and decide', 'Interview stage active', 'active');
    }
    if (snapshot.interview.total > 0) {
      const label = `${snapshot.interview.total} practice session${snapshot.interview.total === 1 ? '' : 's'}`;
      return phase('advance', 'Advance', 'Prepare, interview, and decide', label, 'in-progress');
    }
    return phase('advance', 'Advance', 'Prepare, interview, and decide', 'Not started', 'todo');
  })();

  return [discover, prove, advance].map((p) => ({ ...p, current: p.key === nextMove.phase }));
}

function phase(
  key: PhaseKey,
  title: string,
  summary: string,
  state: string,
  status: PhaseStatus,
): JourneyPhase {
  const href = key === 'discover' ? '/opportunities' : key === 'prove' ? '/build' : '/practice';
  return { key, title, summary, state, status, progress: null, current: false, href };
}

// ── Continue: workflow objects (CV, applications, interview, assessment)

export type ContinueKey = 'cv' | 'applications' | 'interview' | 'assessment';

export interface ContinueItem {
  key: ContinueKey;
  title: string;
  /** Current state label from real data. */
  state: string;
  /** Supporting detail. */
  detail: string;
  /** 0–100 where a real measure exists; else null. */
  progress: number | null;
  ctaLabel: string;
  href: string;
  /** True when this object matches the current next move (for emphasis). */
  emphasis: boolean;
}

const KIND_TO_CONTINUE: Partial<Record<NextMoveKind, ContinueKey>> = {
  cv: 'cv',
  interview: 'interview',
  application: 'applications',
  saved: 'applications',
  opportunity: 'applications',
  assessment: 'assessment',
};

/** The CV / interview / assessment preparation objects (applications is
 *  surfaced as its own prominent panel, so it is excluded here). */
export function buildPreparationItems(
  snapshot: DiscoverSnapshot,
  nextMove: NextMove,
): ContinueItem[] {
  const emphasised = KIND_TO_CONTINUE[nextMove.kind];

  const cv: ContinueItem = {
    key: 'cv',
    title: 'CV',
    state:
      snapshot.cvCompletion === 0
        ? 'Not started'
        : snapshot.cvCompletion >= 100
          ? 'Complete'
          : `${snapshot.cvCompletion}% complete`,
    detail:
      snapshot.cvCompletion === 0
        ? 'Create the evidence your applications rely on.'
        : 'Keep it tailored to the roles you are pursuing.',
    progress: snapshot.cvCompletion > 0 ? snapshot.cvCompletion : null,
    ctaLabel: snapshot.cvCompletion === 0 ? 'Build CV' : 'Open CV builder',
    href: '/cv-builder',
    emphasis: emphasised === 'cv',
  };

  const interview: ContinueItem = {
    key: 'interview',
    title: 'Interview practice',
    state:
      snapshot.interview.total === 0
        ? 'No practice yet'
        : `${snapshot.interview.total} session${snapshot.interview.total === 1 ? '' : 's'}`,
    detail: snapshot.interview.lastRole
      ? `Last: ${snapshot.interview.lastRole}`
      : 'Rehearse answers before the real conversation.',
    progress: null,
    ctaLabel: snapshot.interview.total === 0 ? 'Start practice' : 'Practise again',
    href: '/interview-simulator',
    emphasis: emphasised === 'interview',
  };

  const assessment: ContinueItem = {
    key: 'assessment',
    title: 'Career assessment',
    state: snapshot.assessmentDone ? 'Complete' : 'Not taken',
    detail:
      snapshot.assessmentDone && snapshot.direction?.primary
        ? `Top interest: ${snapshot.direction.primary}`
        : 'Discover role families that fit your interests.',
    progress: null,
    ctaLabel: snapshot.assessmentDone ? 'Review results' : 'Take assessment',
    href: '/assessment',
    emphasis: emphasised === 'assessment',
  };

  return [cv, interview, assessment];
}

// ── Active applications summary ───────────────────────────────────

export interface ActiveApplicationView {
  id: string;
  role: string;
  company: string | null;
  status: string;
  statusLabel: string;
  updatedAt: string;
  href: string;
  /** True when this is the application the next move is about. */
  emphasis: boolean;
}

export function buildActiveApplications(
  snapshot: DiscoverSnapshot,
  nextMove: NextMove,
  now = new Date(),
): ActiveApplicationView[] {
  const focus = selectPrimaryFocus(snapshot.applications, snapshot.savedJobs, now);
  const focusId = focus.type === 'application' ? focus.data.id : null;
  const isFocusApplication = nextMove.kind !== 'saved' && nextMove.kind !== 'opportunity' && nextMove.kind !== 'assessment';

  return activeApplications(snapshot.applications)
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 4)
    .map((app) => ({
      id: app.id,
      role: applicationTitle(app),
      company: applicationCompany(app),
      status: app.status,
      statusLabel: statusLabel(app.status),
      updatedAt: app.updated_at,
      href: `/applications?application=${encodeURIComponent(app.id)}`,
      emphasis: isFocusApplication && app.id === focusId,
    }));
}
