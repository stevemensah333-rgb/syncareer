import type { OpportunityJob } from './opportunity';
import type { OpportunityProfileSignals, RankedOpportunity } from './ranking';

/**
 * Fit explanation for a single opportunity.
 *
 * Everything here is derived from real, observed data only:
 * - the user's recorded skills (`user_skills`),
 * - the user's recorded career interests (completed assessment),
 * - the user's major (repository-maintained role-family vocabulary),
 * - the posting's own skills / seniority language.
 *
 * There is deliberately NO match percentage. The score ranks the feed; the
 * explanation names the facts that produced it so the student can judge it.
 */

export type FitTier = 'strong' | 'good' | 'possible';

export type FitReasonSource = 'major' | 'skill' | 'interest' | 'early-career';

export interface FitReason {
  source: FitReasonSource;
  /** Human-readable evidence, e.g. "Recorded skills · Python, FastAPI". */
  text: string;
}

export interface FitGap {
  /** A skill listed by the posting source. */
  skill: string;
  /** Why it is surfaced: the student has recorded skills, but not this one. */
  note: string;
}

export interface FitExplanation {
  tier: FitTier;
  /** Short label, e.g. "Strong fit". Never a number. */
  label: string;
  reasons: FitReason[];
  /** Absence is not a claim of incapability — it is a "check before applying" cue. */
  gaps: FitGap[];
}

const TIER_LABELS: Record<FitTier, string> = {
  strong: 'Strong fit',
  good: 'Good fit',
  possible: 'Worth a look',
};

/** True when the student has at least one real signal the feed can use. */
export function hasProfileSignals(profile: OpportunityProfileSignals): boolean {
  return Boolean(
    profile.major?.trim() ||
      (profile.skills ?? []).length > 0 ||
      (profile.interests ?? []).length > 0,
  );
}

function firstDetails(values: string[], limit: number): string {
  return values.slice(0, limit).join(', ');
}

/**
 * Builds the fit explanation for one already-ranked opportunity.
 *
 * Returns null when:
 * - the student has no personalization signals at all (nothing to explain — the
 *   page shows an "add your skills" invitation instead), or
 * - no recorded signal appears in the posting, or
 * - the only signal is generic early-career language, which is a structural
 *   ordering hint, not evidence of fit.
 */
export function buildFitExplanation(
  job: OpportunityJob,
  ranked: RankedOpportunity,
  profile: OpportunityProfileSignals,
): FitExplanation | null {
  if (!hasProfileSignals(profile)) return null;

  const reasons: FitReason[] = [];
  if (ranked.majorAligned && profile.major?.trim()) {
    reasons.push({ source: 'major', text: `Your major · ${profile.major.trim()}` });
  }
  if (ranked.matchedSkills.length > 0) {
    reasons.push({
      source: 'skill',
      text: `Recorded skills · ${firstDetails(ranked.matchedSkills, 3)}`,
    });
  }
  if (ranked.matchedInterests.length > 0) {
    reasons.push({
      source: 'interest',
      text: `Your interests · ${firstDetails(ranked.matchedInterests, 2)}`,
    });
  }
  if (ranked.earlyCareerFriendly && ranked.matchedSkills.length > 0) {
    reasons.push({ source: 'early-career', text: 'Early-career role' });
  }

  if (reasons.length === 0) return null;

  let tier: FitTier;
  if (ranked.matchedSkills.length >= 2 || (ranked.majorAligned && ranked.matchedSkills.length >= 1)) {
    tier = 'strong';
  } else if (ranked.majorAligned || ranked.matchedSkills.length >= 1) {
    tier = 'good';
  } else if (ranked.matchedInterests.length >= 1) {
    tier = 'possible';
  } else {
    return null;
  }

  const recordedSkills = new Set(
    (profile.skills ?? []).map((skill) => skill.trim().toLocaleLowerCase()).filter(Boolean),
  );
  const listedSkills = (job.skills ?? [])
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0);
  const gaps = listedSkills
    .filter((skill) => !recordedSkills.has(skill.toLocaleLowerCase()))
    .slice(0, 2)
    .map((skill) => ({
      skill,
      note: 'Listed by the source; not in your recorded skills',
    }));

  return { tier, label: TIER_LABELS[tier], reasons, gaps };
}
