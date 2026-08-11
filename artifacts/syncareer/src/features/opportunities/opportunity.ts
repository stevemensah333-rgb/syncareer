import type { Database } from '@/integrations/supabase/types';

/**
 * Domain helpers for the opportunity workspace.
 *
 * Everything here derives ONLY from fields that actually exist on
 * `job_postings`: title, organisation columns, location/employment_type,
 * source/source_url/external_id, application_deadline, created/updated
 * timestamps, experience_level, skills, description/requirements.
 *
 * The table has NO verification or freshness columns, so helpers here never
 * claim a listing is verified or current — provenance is described from the
 * evidence we do have (source name, source URL, timestamps).
 */

export type OpportunityJob = Database['public']['Tables']['job_postings']['Row'];

export type MatchedOpportunityJob = OpportunityJob;

/** Minimal shape accepted by the fact helpers (works for partial joins too). */
export interface OpportunityJobFacts {
  title?: string | null;
  company_name?: string | null;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  experience_level?: string | null;
  source?: string | null;
  source_url?: string | null;
  application_deadline?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

// ── Organisation ──────────────────────────────────────────────────

/** `company_name` when present, else the (older) `department` column. Null when neither exists. */
export function getOrganisation(job: OpportunityJobFacts): string | null {
  const company = job.company_name?.trim();
  if (company) return company;
  const department = job.department?.trim();
  if (department) return department;
  return null;
}

// ── Work mode ─────────────────────────────────────────────────────

/**
 * Only 'remote' is evidenced by the data model (it is one of the employment
 * type values written by the aggregator and appears in location text).
 * Returns null otherwise — we do not infer "on-site" or "hybrid".
 */
export function getWorkModeLabel(job: OpportunityJobFacts): string | null {
  const text = `${job.employment_type ?? ''} ${job.location ?? ''}`.toLowerCase();
  if (/(^|[^a-z])remote([^a-z]|$)/.test(text)) return 'Remote';
  return null;
}

// ── Eligibility ───────────────────────────────────────────────────

const EXPERIENCE_LABELS: Record<string, string> = {
  entry: 'Entry level / early career',
  mid: 'Mid level',
  senior: 'Senior level',
};

/** Human label for the stored experience level. Null when not specified — never guess. */
export function experienceLevelLabel(level: string | null | undefined): string | null {
  if (!level) return null;
  const normalized = level.trim().toLowerCase();
  if (!normalized) return null;
  return EXPERIENCE_LABELS[normalized] ?? normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

// ── Deadlines ─────────────────────────────────────────────────────

export type DeadlineKind = 'none' | 'passed' | 'today' | 'closing-soon' | 'upcoming';

export interface DeadlineState {
  kind: DeadlineKind;
  /** Whole days until the deadline; null when there is no usable deadline. */
  daysLeft: number | null;
  /** Parsed deadline date; null when missing or unparseable. */
  date: Date | null;
  label: string;
}

function formatDeadlineDate(date: Date): string {
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Classify a posting deadline. `now` is injectable for deterministic tests.
 * Missing/unparseable deadlines yield `kind: 'none'` — a partial-data state
 * the UI must render explicitly instead of hiding.
 */
export function getDeadlineState(
  deadline: string | null | undefined,
  now: number = Date.now(),
): DeadlineState {
  if (!deadline) return { kind: 'none', daysLeft: null, date: null, label: 'No deadline listed' };
  const time = new Date(deadline).getTime();
  if (Number.isNaN(time)) return { kind: 'none', daysLeft: null, date: null, label: 'No deadline listed' };
  const date = new Date(time);
  // Calendar-day semantics: a deadline later today is still "today".
  const nowDate = new Date(now);
  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const startOfDeadlineDay = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysLeft = Math.round((startOfDeadlineDay - startOfToday) / 86400000);
  if (daysLeft < 0) {
    return {
      kind: 'passed',
      daysLeft,
      date,
      label: `Deadline passed ${formatDeadlineDate(date)}`,
    };
  }
  if (daysLeft === 0) return { kind: 'today', daysLeft, date, label: 'Closes today' };
  if (daysLeft === 1) return { kind: 'closing-soon', daysLeft, date, label: 'Closes tomorrow' };
  if (daysLeft <= 7) {
    return { kind: 'closing-soon', daysLeft, date, label: `Closes in ${daysLeft} days` };
  }
  return { kind: 'upcoming', daysLeft, date, label: `Deadline ${formatDeadlineDate(date)}` };
}

export function deadlineIsUrgent(state: DeadlineState): boolean {
  return state.kind === 'today' || state.kind === 'closing-soon';
}

// ── Provenance / verification ─────────────────────────────────────

/**
 * One-line honesty statement shown wherever provenance is surfaced. The
 * schema carries no verification evidence, so this product never claims a
 * listing is verified or current.
 */
export const PROVENANCE_NOTE =
  'Aggregated from an external job source and not independently verified by Syncareer. Confirm the role, requirements, and deadline on the original posting.';

export interface ProvenanceFacts {
  /** Raw source id stored on the row (e.g. "jobberman"). */
  source: string | null;
  /** Display label for the source; falls back to a generic external label. */
  sourceLabel: string;
  sourceUrl: string | null;
  postedAt: string | null;
  updatedAt: string | null;
  /**
   * Always false: `job_postings` has no verification fields, so there is no
   * evidence this listing was verified. Kept as an explicit field so UI code
   * cannot accidentally imply verification.
   */
  verified: false;
}

export function getProvenanceFacts(job: OpportunityJobFacts): ProvenanceFacts {
  const source = job.source?.trim() || null;
  const sourceLabel = source ? source.charAt(0).toUpperCase() + source.slice(1) : 'External source';
  return {
    source,
    sourceLabel,
    sourceUrl: job.source_url ?? null,
    postedAt: job.created_at ?? null,
    updatedAt: job.updated_at ?? null,
    verified: false,
  };
}

// ── Ingestion timestamps ──────────────────────────────────────────

/** "Today" / "Yesterday" / "3d ago" / ...; null for missing or unparseable input. */
export function formatPostedAgo(createdAt: string | null | undefined, now: number = Date.now()): string | null {
  if (!createdAt) return null;
  const time = new Date(createdAt).getTime();
  if (Number.isNaN(time)) return null;
  const days = Math.floor((now - time) / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export type FreshnessKind = 'recent' | 'stale' | 'unknown';

export interface FreshnessState {
  kind: FreshnessKind;
  label: string;
}

/**
 * `updated_at` is an ingestion/database timestamp, not proof that the source
 * posting was republished or remains open. The UI labels it accordingly.
 */
export function getIngestionFreshness(
  updatedAt: string | null | undefined,
  now: number = Date.now(),
): FreshnessState {
  if (!updatedAt) return { kind: 'unknown', label: 'Ingestion freshness unknown' };
  const time = new Date(updatedAt).getTime();
  if (Number.isNaN(time)) return { kind: 'unknown', label: 'Ingestion freshness unknown' };
  const days = Math.max(0, Math.floor((now - time) / 86400000));
  if (days > 14) return { kind: 'stale', label: `Listing data last ingested ${days} days ago` };
  if (days === 0) return { kind: 'recent', label: 'Listing data ingested today' };
  if (days === 1) return { kind: 'recent', label: 'Listing data ingested yesterday' };
  return { kind: 'recent', label: `Listing data ingested ${days} days ago` };
}

// ── Opportunity-level call to action ──────────────────────────────

export type OpportunityCtaKind = 'apply-external' | 'apply-native' | 'open-tracker' | 'source-unavailable';

export interface OpportunityCtaInput {
  isExternal: boolean;
  hasSourceUrl: boolean;
  /** Whether the signed-in user already tracks an application for this job. */
  tracked: boolean;
}

/**
 * The primary action for an opportunity. Tracked opportunities route to the
 * tracker (the central object); external postings with a source URL apply on
 * the source site; anything else uses the native in-product apply insert.
 */
export function getOpportunityCta(input: OpportunityCtaInput): OpportunityCtaKind {
  if (input.tracked) return 'open-tracker';
  if (input.isExternal && input.hasSourceUrl) return 'apply-external';
  if (input.isExternal) return 'source-unavailable';
  return 'apply-native';
}
