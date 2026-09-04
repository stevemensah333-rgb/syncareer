/**
 * Pure derivation layer for the Career Profile result experience.
 *
 * Everything here is derived from data the product already persists:
 *   - assessment interest scores (`assessments.work_interest_score_json`,
 *     `personality_score_json`, `skills_score_json`),
 *   - interest-based career directions (`careers` + the canonical matcher in
 *     `useCareerRecommendations`),
 *   - the student's recorded skills (`user_skills`),
 *   - the student's evidence dossier (`evidence_items`),
 *   - saved opportunities (`saved_jobs` → `job_postings`).
 *
 * Nothing here measures skill, readiness, hiring probability or aptitude:
 * interest alignment only says "this kind of work may be worth exploring".
 * Skill gaps are phrased as "not yet recorded" — an absence in Syncareer,
 * never a claim that the person lacks the ability.
 */
import { RIASEC_LABELS, RIASEC_DESCRIPTIONS } from '@/data/assessmentQuestions';
import { PERSONALITY_AXES, SKILLS_AXES } from './chartData';
import type { AssessmentResult } from '@/hooks/useAssessment';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

// ── Interest themes ──────────────────────────────────────────────────────

export interface InterestTheme {
  /** RIASEC letter code, e.g. "I". */
  code: string;
  label: string;
  description: string;
  /** Normalised 0–100 interest score from the canonical scorer. */
  score: number;
  rank: 1 | 2 | 3;
}

/**
 * The three strongest interest themes, in rank order, derived strictly from
 * the stored assessment scores.
 */
export function topInterestThemes(result: AssessmentResult): InterestTheme[] {
  const ordered = Object.entries(result.work_interest_score_json)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 3);

  return ordered.map(([code, score], index) => ({
    code,
    label: RIASEC_LABELS[code] ?? code,
    description: RIASEC_DESCRIPTIONS[code] ?? '',
    score: score as number,
    rank: (index + 1) as 1 | 2 | 3,
  }));
}

// ── What this suggests (preferences derived from the actual answers) ──────

export interface WorkPreference {
  /** Short name for the pattern, e.g. "Leading & initiating". */
  title: string;
  /** What the pattern says about the kinds of work the person is drawn to. */
  description: string;
  /** 0–100 aggregate of the self-report answers behind this pattern. */
  score: number;
}

const PERSONALITY_PREFERENCE_COPY: Record<string, { title: string; description: string }> = {
  Leadership: {
    title: 'Leading & initiating',
    description: 'You responded positively to taking initiative, speaking up and guiding groups — work where you can own decisions and move things forward.',
  },
  Social: {
    title: 'Working with & helping people',
    description: 'Your answers lean toward connecting with, supporting and collaborating with people — work built around relationships.',
  },
  Adaptability: {
    title: 'Working with change',
    description: 'You reported comfort with shifting plans and uncertainty — work that is dynamic rather than tightly scripted.',
  },
  Independence: {
    title: 'Autonomy & structure',
    description: 'Your answers describe a mix of independent work and structured routines — work with clear scope you can drive yourself.',
  },
  Detail: {
    title: 'Analysis & attention to detail',
    description: 'You gravitate toward careful, analytical work — problems with patterns to find and details that matter.',
  },
  Drive: {
    title: 'Goals & momentum',
    description: 'You described staying calm under pressure and being motivated by goals — work with clear targets to aim at.',
  },
};

const SKILL_PREFERENCE_COPY: Record<string, { title: string; description: string }> = {
  Tech: {
    title: 'Building with technology',
    description: 'You reported enjoying learning software and building technical solutions — tools and systems feel like play, not chores.',
  },
  'Problem Solving': {
    title: 'Research & problem solving',
    description: 'You are drawn to investigating questions and working through problems from first principles.',
  },
  Data: {
    title: 'Numbers & data',
    description: 'Spreadsheets, budgets and quantitative work appealed to you — work where decisions can be informed by data.',
  },
  Writing: {
    title: 'Writing & content',
    description: 'You enjoy writing reports, articles or creative content — work where words are the medium.',
  },
  Design: {
    title: 'Design & visual work',
    description: 'Visuals, layouts and interfaces appeal to you — work that shapes how things look and feel.',
  },
  Presenting: {
    title: 'Presenting & persuading',
    description: 'You reported presenting, negotiating and persuading as comfortable activities — work that involves influencing an audience.',
  },
  Planning: {
    title: 'Organising & planning',
    description: 'Organising events, managing time and meeting deadlines fit you — work that benefits from structure and coordination.',
  },
  Negotiation: {
    title: 'Negotiation',
    description: 'You are comfortable negotiating and mediating — work that involves finding agreement between people.',
  },
  Relationships: {
    title: 'Relationships, mentoring & teaching',
    description: 'Building relationships, mentoring and teaching drew positive responses — work centred on developing people.',
  },
};

interface AxisDef {
  label: string;
  qIds: readonly number[];
}

function axisPreference(
  axes: ReadonlyArray<AxisDef>,
  scores: Record<string, number>,
  minimum: number,
): Array<{ title: string; description: string; score: number }> {
  return axes
    .map(({ label, qIds }) => {
      const values = qIds
        .map((id) => scores[`q${id}`] ?? 0)
        .filter((value) => value > 0);
      const average =
        values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
      return { label, score: Math.round((average / 5) * 100) };
    })
    .filter((axis) => axis.score >= minimum)
    .sort((a, b) => b.score - a.score)
    .map((axis) => ({
      title: axis.label,
      description: '',
      score: axis.score,
    }));
}

/**
 * Work preferences read from the self-report personality (Q1–15) and task
 * preference (Q16–30) answers. These are interest/enjoyment patterns — not
 * measured skill levels. Only patterns at or above 60% are surfaced, so the
 * section stays meaningful rather than restating every question.
 */
export function derivedWorkPreferences(result: AssessmentResult): WorkPreference[] {
  const personality = axisPreference(
    PERSONALITY_AXES,
    result.personality_score_json as Record<string, number>,
    60,
  )
    .map((axis) => {
      const copy = PERSONALITY_PREFERENCE_COPY[axis.title];
      return copy
        ? { title: copy.title, description: copy.description, score: axis.score }
        : null;
    })
    .filter((entry): entry is WorkPreference => entry !== null);

  const skills = axisPreference(
    SKILLS_AXES,
    result.skills_score_json as Record<string, number>,
    60,
  )
    .map((axis) => {
      const copy = SKILL_PREFERENCE_COPY[axis.title];
      return copy
        ? { title: copy.title, description: copy.description, score: axis.score }
        : null;
    })
    .filter((entry): entry is WorkPreference => entry !== null);

  return [...personality, ...skills].slice(0, 6);
}

// ── Career directions ────────────────────────────────────────────────────

export interface CareerDirection {
  recommendation: CareerRecommendation;
  /** Top-3 interest themes whose descriptions this direction overlaps. */
  matchingThemes: InterestTheme[];
}

const THEME_MATCH_THRESHOLD = 0.4;

/**
 * Split the matcher's interest-ordered role families into the strongest
 * matches to lead with and alternative directions worth keeping in view.
 */
export function splitCareerDirections(
  recommendations: CareerRecommendation[],
  themes: InterestTheme[],
): { strongest: CareerDirection[]; alternatives: CareerDirection[] } {
  const toDirection = (recommendation: CareerRecommendation): CareerDirection => ({
    recommendation,
    matchingThemes: themes.filter(
      (theme) => (recommendation.career.riasec_profile[theme.code] ?? 0) >= THEME_MATCH_THRESHOLD,
    ),
  });

  return {
    strongest: recommendations.slice(0, 3).map(toDirection),
    alternatives: recommendations.slice(3, 8).map(toDirection),
  };
}

// ── Market signal from current opportunities ─────────────────────────────

export interface MarketSignal {
  /** Role family the signal is for. */
  directionTitle: string;
  /** Skills appearing most often across current open postings for the family. */
  commonlyEmphasized: string[];
  /** How many current postings the signal is based on. */
  postingCount: number;
}

interface MarketPosting {
  title: string;
  skills: string[] | null;
}

/**
 * Build a contextual market signal for one direction from *current open
 * postings*: which skills the live listings most often mention. This is
 * market context for exploration — it never implies interest alignment proves
 * suitability. Returns null when there are no postings to summarise.
 */
export function marketSignalForDirection(
  directionTitle: string,
  postings: MarketPosting[],
  maxSkills = 4,
): MarketSignal | null {
  const query = directionTitle.toLowerCase();
  const tokens = query.split(/\s+/).filter((token) => token.length >= 4);
  const matches = postings.filter((posting) => {
    const title = posting.title.toLowerCase();
    return tokens.some((token) => title.includes(token));
  });
  if (matches.length === 0) return null;

  const frequency = new Map<string, number>();
  for (const posting of matches) {
    for (const skill of posting.skills ?? []) {
      const name = skill.trim();
      if (name) frequency.set(name, (frequency.get(name) ?? 0) + 1);
    }
  }

  const commonlyEmphasized = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxSkills)
    .map(([skill]) => skill);

  return { directionTitle, commonlyEmphasized, postingCount: matches.length };
}

// ── Relevant skills & gaps (from persisted records) ──────────────────────

export interface RecordedSkill {
  name: string;
  proficiency: string;
}

export interface SkillGap {
  skill: string;
  /**
   * Source of the expectation: the directions the skill commonly appears
   * across, e.g. "commonly expected across Software Engineering, Data Analyst".
   */
  context: string;
}

/**
 * Skills the student has actually recorded (`user_skills`) which also appear
 * in the strongest career directions' expected-skills lists. Relevant skills
 * are recorded evidence of activity, not measured mastery.
 */
export function relevantSkillsForDirections(
  directions: CareerDirection[],
  recordedSkills: RecordedSkill[],
  limit = 8,
): RecordedSkill[] {
  const expected = new Set(
    directions.flatMap((direction) =>
      (direction.recommendation.career.required_skills ?? []).map((skill) =>
        skill.toLowerCase(),
      ),
    ),
  );

  const seen = new Set<string>();
  return recordedSkills
    .filter((skill) => expected.has(skill.name.toLowerCase()))
    .filter((skill) => {
      const key = skill.name.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * Skills commonly expected across the strongest directions that the student
 * has not yet recorded. Framed as exploration gaps — "not yet recorded in
 * Syncareer" — not as proof of inability.
 */
export function explorationGapsForDirections(
  directions: CareerDirection[],
  recordedSkills: RecordedSkill[],
): SkillGap[] {
  const recorded = new Set(recordedSkills.map((skill) => skill.name.toLowerCase()));
  const appearance = new Map<string, { name: string; count: number; directions: string[] }>();

  for (const direction of directions) {
    for (const skill of direction.recommendation.career.required_skills ?? []) {
      const key = skill.toLowerCase();
      if (recorded.has(key)) continue;
      const entry = appearance.get(key) ?? { name: skill, count: 0, directions: [] };
      entry.count += 1;
      if (!entry.directions.includes(direction.recommendation.career.title)) {
        entry.directions.push(direction.recommendation.career.title);
      }
      appearance.set(key, entry);
    }
  }

  return [...appearance.values()]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 6)
    .map((entry) => {
      const directionLabel =
        entry.directions.length === 1
          ? entry.directions[0]
          : `${entry.directions.slice(0, 2).join(' and ')} directions`;
      return {
        skill: entry.name,
        context: `Commonly expected across ${directionLabel}`,
      };
    });
}

// ── Longitudinal comparison ──────────────────────────────────────────────

export interface InterestChange {
  code: string;
  label: string;
  /** Signed change in the normalised 0–100 score, latest minus previous. */
  delta: number;
}

export interface AssessmentComparison {
  latestDate: string;
  previousDate: string;
  /** Themes in the latest top three that were not in the previous top three. */
  emergedThemes: InterestTheme[];
  /** Themes that have dropped out of the top three. */
  recededLabels: string[];
  /** Largest absolute score movements between the two assessments. */
  biggestMoves: InterestChange[];
  /** True when the ordered top three labels are identical. */
  topThreeStable: boolean;
}

/**
 * Compare the latest completed assessment with the one before it. Both rows
 * come from the persisted `assessments` history — no history is invented.
 */
export function compareAssessments(
  latest: AssessmentResult,
  previous: AssessmentResult,
): AssessmentComparison {
  const latestThemes = topInterestThemes(latest);
  const previousThemes = topInterestThemes(previous);

  const previousCodes = new Set(previousThemes.map((theme) => theme.code));
  const latestCodes = new Set(latestThemes.map((theme) => theme.code));

  const emerged = latestThemes.filter((theme) => !previousCodes.has(theme.code));
  const receded = previousThemes
    .filter((theme) => !latestCodes.has(theme.code))
    .map((theme) => theme.label);

  const changes: InterestChange[] = Object.keys(RIASEC_LABELS).map((code) => ({
    code,
    label: RIASEC_LABELS[code] ?? code,
    delta:
      (latest.work_interest_score_json[code] ?? 0) -
      (previous.work_interest_score_json[code] ?? 0),
  }));

  const biggestMoves = changes
    .filter((change) => change.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);

  const topThreeStable =
    latestThemes.every((theme, index) => theme.code === previousThemes[index]?.code) &&
    latestThemes.length === previousThemes.length;

  return {
    latestDate: latest.completed_at,
    previousDate: previous.completed_at,
    emergedThemes: emerged,
    recededLabels: receded,
    biggestMoves,
    topThreeStable,
  };
}
