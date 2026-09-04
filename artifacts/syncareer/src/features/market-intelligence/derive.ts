/**
 * Pure derivation layer for Market Intelligence.
 *
 * Everything here is derived from data the product already persists:
 *   - the cached market-intelligence report (an AI *estimate* produced by the
 *     `market-intelligence` edge function and cached in
 *     `market_intelligence_cache` by major/region for 7 days),
 *   - the student's recorded skills (`user_skills`, with a stored
 *     proficiency label),
 *   - assessment interests (`assessments` RIASEC labels),
 *   - tracked applications (`job_applications`),
 *   - saved opportunities (`saved_jobs` → `job_postings`), and
 *   - current open postings (`job_postings`, active + external).
 *
 * Nothing here invents numbers. Market figures are the model's estimates —
 * never verified statistics — so callers must surface them with provenance,
 * confidence and freshness (the UI does this via `ProvenanceNote`). Skill
 * statements are framed as "recorded" / "not recorded in Syncareer", never as
 * a claim about a person's ability.
 */

import type { HardSkill, MarketIntelligence } from '@/hooks/useMarketIntelligence';
import { getMajorTerms } from '@/features/opportunities/ranking';

// ── Region metadata ────────────────────────────────────────────────────────
// Mirrors REGION_LABELS in the market-intelligence edge function. The currency
// list matches the edge function's per-region currency mapping: salary values
// in the report are estimates in the region's local currency (the model is
// prompted in local currency), even though the cached field names end in
// `_usd` for historical reasons.

export const REGION_LABELS: Record<string, string> = {
  accra_ghana: 'Accra, Ghana',
  lagos_nigeria: 'Lagos, Nigeria',
  nairobi_kenya: 'Nairobi, Kenya',
  cape_town_sa: 'Cape Town, South Africa',
  remote_africa: 'Remote (Africa-friendly)',
  remote_global: 'Remote (Global)',
  global: 'Global benchmark',
};

export const REGION_CURRENCY: Record<string, string> = {
  accra_ghana: 'GHS',
  lagos_nigeria: 'NGN',
  nairobi_kenya: 'KES',
  cape_town_sa: 'ZAR',
  remote_africa: 'USD',
  remote_global: 'USD',
  global: 'USD',
};

// ── User-side signals ──────────────────────────────────────────────────────

export interface RecordedSkill {
  name: string;
  proficiency: string;
}

export interface MarketPosting {
  title: string;
  skills: string[] | null;
}

export interface MarketUserSignals {
  recordedSkills: RecordedSkill[];
  /** Assessment interest labels (RIASEC), e.g. ["Investigative", "Realistic"]. */
  interests: string[];
  /** Tracked applications not yet in a terminal state. */
  activeApplications: number;
  /** Tracked application count by status. */
  applicationsByStatus: Record<string, number>;
  /** Titles of roles behind the student's saved opportunities. */
  savedRoleTitles: string[];
  /** Current active external postings (title + skills). */
  postings: MarketPosting[];
}

export const EMPTY_SIGNALS: MarketUserSignals = {
  recordedSkills: [],
  interests: [],
  activeApplications: 0,
  applicationsByStatus: {},
  savedRoleTitles: [],
  postings: [],
};

/** Terminal application states excluded from "active". */
const TERMINAL_APPLICATION_STATUSES = new Set(['rejected', 'withdrawn', 'hired']);

export function countActiveApplications(statuses: Record<string, number>): number {
  return Object.entries(statuses).reduce(
    (sum, [status, count]) => (TERMINAL_APPLICATION_STATUSES.has(status) ? sum : sum + count),
    0,
  );
}

// ── Skill matching ─────────────────────────────────────────────────────────

function normalizeSkill(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isWordChar(char: string): boolean {
  return /[a-z0-9+#.]/.test(char);
}

/**
 * Word-boundary substring match: "sql" matches "sql & databases" but "java"
 * does not match "javascript". Avoids the substring false positives the old
 * skill matcher produced.
 */
export function skillMatches(a: string, b: string): boolean {
  const na = normalizeSkill(a);
  const nb = normalizeSkill(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length <= nb.length ? na : nb;
  const longer = shorter === na ? nb : na;
  if (shorter.length < 3) return false;
  const index = longer.indexOf(shorter);
  if (index < 0) return false;
  const beforeOk = index === 0 || !isWordChar(longer.charAt(index - 1));
  const end = index + shorter.length;
  const afterOk = end === longer.length || !isWordChar(longer.charAt(end));
  return beforeOk && afterOk;
}

export interface SkillMatchResult {
  /** Market skills the student has recorded. */
  matched: HardSkill[];
  /** Market skills not recorded, ordered by demand (highest first). */
  missing: HardSkill[];
}

export function matchHardSkills(skills: HardSkill[], recorded: RecordedSkill[]): SkillMatchResult {
  const matched: HardSkill[] = [];
  const missing: HardSkill[] = [];
  for (const skill of skills) {
    const has = recorded.some((entry) => skillMatches(entry.name, skill.skill));
    if (has) matched.push(skill);
    else missing.push(skill);
  }
  missing.sort((a, b) => b.demand_score - a.demand_score);
  return { matched, missing };
}

export interface MatchedSkill {
  /** The market skill the student has recorded. */
  market: HardSkill;
  /** The student's recorded entry, including its stored proficiency label. */
  recorded: RecordedSkill;
}

/**
 * Demanded skills the student has recorded, paired with their recorded entry
 * (the "evidence" the UI cites). Ordered by market demand, highest first.
 */
export function matchedWithEvidence(
  skills: HardSkill[],
  recorded: RecordedSkill[],
): MatchedSkill[] {
  const result: MatchedSkill[] = [];
  for (const skill of skills) {
    const entry = recorded.find((candidate) => skillMatches(candidate.name, skill.skill));
    if (entry) result.push({ market: skill, recorded: entry });
  }
  result.sort((a, b) => b.market.demand_score - a.market.demand_score);
  return result;
}

// ── Demand direction & requirements ────────────────────────────────────────

export type DemandDirection = 'rising' | 'stable' | 'declining' | null;

/**
 * Whether demand is rising/stable/declining. Prefers the 12-month forecast's
 * first-vs-last demand index; falls back to the majority trend across hard
 * skills. A small epsilon keeps noise from reading as a "change".
 */
export function demandDirection(data: MarketIntelligence): DemandDirection {
  const forecast = data.demand_forecast ?? [];
  if (forecast.length >= 2) {
    const first = forecast[0]?.demand_index;
    const last = forecast[forecast.length - 1]?.demand_index;
    if (typeof first === 'number' && typeof last === 'number') {
      const delta = last - first;
      if (delta >= 4) return 'rising';
      if (delta <= -4) return 'declining';
      return 'stable';
    }
  }
  const trends = (data.hard_skills ?? []).map((skill) => skill.trend);
  const rising = trends.filter((t) => t === 'rising').length;
  const declining = trends.filter((t) => t === 'declining').length;
  if (rising > declining) return 'rising';
  if (declining > rising) return 'declining';
  return 'stable';
}

/** Parse a growth label like "+12%" or "-3%" into a signed number. */
export function parseGrowthPercent(value: string): number | null {
  const match = value.trim().match(/^([+-]?\d+(?:\.\d+)?)\s*%?$/);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Most commonly asked-for skills (by demand score). */
export function commonRequirements(skills: HardSkill[], count = 4): HardSkill[] {
  return [...skills].sort((a, b) => b.demand_score - a.demand_score).slice(0, count);
}

/** Rising skills that are not yet among the most common — "emerging". */
export function emergingRequirements(skills: HardSkill[], count = 3): HardSkill[] {
  const common = new Set(commonRequirements(skills, 4).map((s) => s.skill));
  return skills
    .filter((skill) => skill.trend === 'rising' && !common.has(skill.skill))
    .sort(
      (a, b) =>
        (parseGrowthPercent(b.growth_percent) ?? 0) - (parseGrowthPercent(a.growth_percent) ?? 0) ||
        b.demand_score - a.demand_score,
    )
    .slice(0, count);
}

export function decliningSkills(skills: HardSkill[]): HardSkill[] {
  return skills.filter((skill) => skill.trend === 'declining');
}

// ── Gaps & opportunities ───────────────────────────────────────────────────

export interface MarketGap {
  skill: HardSkill;
  /** Open postings whose listed skills mention this skill. */
  postingCount: number;
}

function postingsMentioningSkill(postings: MarketPosting[], skill: string): number {
  return postings.filter((posting) =>
    (posting.skills ?? []).some((listed) => skillMatches(listed, skill)),
  ).length;
}

/** Missing in-demand skills, ranked by demand, with live-posting evidence. */
export function deriveGaps(
  skills: HardSkill[],
  recorded: RecordedSkill[],
  postings: MarketPosting[],
): MarketGap[] {
  return matchHardSkills(skills, recorded).missing.map((skill) => ({
    skill,
    postingCount: postingsMentioningSkill(postings, skill.skill),
  }));
}

/** Live postings whose title matches the major's role family. */
export function relevantPostingsForMajor(
  postings: MarketPosting[],
  major: string | null | undefined,
  max = 4,
): MarketPosting[] {
  if (!major?.trim()) return [];
  const terms = getMajorTerms(major).map((term) => term.toLocaleLowerCase());
  return postings
    .filter((posting) => {
      const title = posting.title.toLocaleLowerCase();
      return terms.some((term) => term.length >= 3 && title.includes(term));
    })
    .slice(0, max);
}

// ── The market conclusion ──────────────────────────────────────────────────

export interface MarketConclusion {
  /** The region's market state, as returned by the model. */
  marketState: string;
  direction: DemandDirection;
  /** Top demanded skills (names). */
  topDemand: string[];
  /** Demanded skills the student has recorded (names). */
  matched: string[];
  /** How many of the top 5 demanded skills are not recorded. */
  missingOfTopFive: number;
  /** Largest gap (highest-demand unrecorded skill) with live-posting evidence. */
  topGap: { skill: string; postingCount: number } | null;
  /** Assessment interest labels on file. */
  interestLabels: string[];
  /** Tracked applications not in a terminal state. */
  activeApplications: number;
}

/**
 * Assembles the one-sentence answer the page opens with: what is happening in
 * the market and what it means for this user. Every fact is derived from the
 * report (estimate) or from persisted records; nothing here asserts ability.
 */
export function buildMarketConclusion(
  data: MarketIntelligence,
  signals: MarketUserSignals,
): MarketConclusion {
  const skills = data.hard_skills ?? [];
  const { matched, missing } = matchHardSkills(skills, signals.recordedSkills);
  const topFive = commonRequirements(skills, 5);
  const missingOfTopFive = topFive.filter(
    (skill) => !matched.some((m) => m.skill === skill.skill),
  ).length;
  const topGap = missing[0]
    ? {
        skill: missing[0].skill,
        postingCount: postingsMentioningSkill(signals.postings, missing[0].skill),
      }
    : null;

  return {
    marketState: (data.region_summary ?? '').trim(),
    direction: demandDirection(data),
    topDemand: topFive.slice(0, 3).map((skill) => skill.skill),
    matched: matched.slice(0, 4).map((skill) => skill.skill),
    missingOfTopFive,
    topGap,
    interestLabels: [...new Set(signals.interests.filter(Boolean))],
    activeApplications: signals.activeApplications,
  };
}

// ── Formatting (pure) ──────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Deterministic report date, e.g. "4 Sep 2026". */
export function formatReportDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Formats an estimated local-currency salary figure, e.g. "GHS 24k". Values
 * below 1,000 are shown whole; otherwise rounded to a compact "k" form so an
 * estimate never reads as a precise figure.
 */
export function formatLocalSalary(value: number, currency: string): string {
  if (!Number.isFinite(value) || value <= 0) return `${currency} —`;
  if (value >= 1000) {
    const k = value / 1000;
    const label = k >= 10 ? String(Math.round(k)) : String(Math.round(k * 10) / 10);
    return `${currency} ${label}k`;
  }
  return `${currency} ${Math.round(value)}`;
}
