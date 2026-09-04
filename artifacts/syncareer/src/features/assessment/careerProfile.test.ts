import { describe, expect, it } from 'vitest';
import {
  compareAssessments,
  derivedWorkPreferences,
  explorationGapsForDirections,
  marketSignalForDirection,
  relevantSkillsForDirections,
  splitCareerDirections,
  topInterestThemes,
  type CareerDirection,
} from './careerProfile';
import type { AssessmentResult } from '@/hooks/useAssessment';
import type { CareerRecommendation } from '@/hooks/useCareerRecommendations';

function result(scores: Record<string, number>, overrides: Partial<AssessmentResult> = {}): AssessmentResult {
  const work_interest_score_json = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...scores };
  const ordered = Object.entries(work_interest_score_json).sort(([, a], [, b]) => b - a);
  const labels: Record<string, string> = {
    R: 'Realistic', I: 'Investigative', A: 'Artistic',
    S: 'Social', E: 'Enterprising', C: 'Conventional',
  };
  return {
    id: 'a1',
    completed_at: '2026-08-01T00:00:00.000Z',
    created_at: '2026-08-01T00:00:00.000Z',
    personality_score_json: {},
    skills_score_json: {},
    work_interest_score_json,
    primary_interest: labels[ordered[0]![0]] ?? null,
    secondary_interest: labels[ordered[1]![0]] ?? null,
    tertiary_interest: labels[ordered[2]![0]] ?? null,
    ...overrides,
  };
}

function recommendation(id: string, title: string, riasec: Record<string, number>, skills: string[] = []): CareerRecommendation {
  return {
    career: {
      id,
      title,
      description: `A role in ${title}`,
      riasec_profile: { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0, ...riasec },
      suggested_majors: [],
      required_skills: skills,
      salary_range: null,
      industry: 'Tech',
    },
    matchScore: 80,
    explanation: 'overlaps with your interests',
  };
}

describe('topInterestThemes', () => {
  it('returns the three highest scoring themes with rank and copy', () => {
    const themes = topInterestThemes(result({ I: 90, A: 70, S: 60, E: 40 }));
    expect(themes.map((theme) => theme.code)).toEqual(['I', 'A', 'S']);
    expect(themes[0]!.rank).toBe(1);
    expect(themes[0]!.label).toBe('Investigative');
    expect(themes[0]!.description).toContain('investigat');
  });
});

describe('derivedWorkPreferences', () => {
  it('surfaces only patterns at or above 60% from self-report answers', () => {
    // Leadership axis = q1, q7, q14 (all 5 → 100%); Social = q4, q9, q11, q15 (1 → 20%)
    const prefs = derivedWorkPreferences(
      result({}, { personality_score_json: { q1: 5, q7: 5, q14: 5, q4: 1, q9: 1, q11: 1, q15: 1 } }),
    );
    expect(prefs.some((p) => p.title === 'Leading & initiating')).toBe(true);
    expect(prefs.some((p) => p.title === 'Working with & helping people')).toBe(false);
  });

  it('maps high task-preference answers to concrete activity copy', () => {
    // Tech axis = q18, q28 → 5/5
    const prefs = derivedWorkPreferences(result({}, { skills_score_json: { q18: 5, q28: 5 } }));
    const tech = prefs.find((p) => p.title === 'Building with technology');
    expect(tech).toBeTruthy();
    expect(tech!.description).toContain('software');
  });
});

describe('splitCareerDirections', () => {
  it('puts the first three in strongest and the rest in alternatives, with matching themes', () => {
    const themes = topInterestThemes(result({ I: 90, A: 70, S: 60 }));
    const recs = [
      recommendation('c1', 'Data Scientist', { I: 0.9, A: 0.5 }),
      recommendation('c2', 'UX Designer', { A: 0.9, S: 0.5 }),
      recommendation('c3', 'Counsellor', { S: 0.9 }),
      recommendation('c4', 'Sales Lead', { E: 0.9 }),
      recommendation('c5', 'Archivist', { C: 0.9, I: 0.4 }),
    ];
    const { strongest, alternatives } = splitCareerDirections(recs, themes);

    expect(strongest).toHaveLength(3);
    expect(alternatives).toHaveLength(2);
    // Data Scientist overlaps I (≥0.4) and A (0.5)
    expect(strongest[0]!.matchingThemes.map((t) => t.code).sort()).toEqual(['A', 'I']);
    // Sales Lead (E) matches none of the I/A/S themes
    expect(alternatives.find((d) => d.recommendation.career.id === 'c4')!.matchingThemes).toEqual([]);
  });
});

describe('marketSignalForDirection', () => {
  const postings = [
    { title: 'Backend Engineer', skills: ['Python', 'APIs', 'PostgreSQL'] },
    { title: 'Backend Engineering Intern', skills: ['Python', 'Docker'] },
    { title: 'Marketing Associate', skills: ['SEO', 'Content'] },
  ];

  it('summarises the most commonly emphasised skills across matching postings', () => {
    const signal = marketSignalForDirection('Backend Engineering', postings);
    expect(signal).not.toBeNull();
    expect(signal!.postingCount).toBe(2);
    expect(signal!.commonlyEmphasized[0]).toBe('Python');
  });

  it('returns null when no current posting matches the direction', () => {
    expect(marketSignalForDirection('Marine Biology', postings)).toBeNull();
  });
});

describe('relevantSkillsForDirections and explorationGapsForDirections', () => {
  const directions: CareerDirection[] = [
    { recommendation: recommendation('c1', 'Data Analyst', { I: 0.9 }, ['SQL', 'Excel', 'Communication']), matchingThemes: [] },
    { recommendation: recommendation('c2', 'Backend Engineer', { I: 0.8 }, ['Python', 'SQL', 'APIs']), matchingThemes: [] },
  ];
  const recorded = [
    { name: 'Python', proficiency: 'intermediate' },
    { name: 'python', proficiency: 'beginner' },
    { name: 'Pottery', proficiency: 'expert' },
  ];

  it('lists recorded skills that the strongest directions expect, de-duplicated case-insensitively', () => {
    const relevant = relevantSkillsForDirections(directions, recorded);
    expect(relevant.map((skill) => skill.name)).toEqual(['Python']);
  });

  it('lists expected skills not yet recorded as exploration gaps with direction context', () => {
    const gaps = explorationGapsForDirections(directions, recorded);
    const gapNames = gaps.map((gap) => gap.skill);
    expect(gapNames).toContain('SQL');
    expect(gapNames).not.toContain('Python');
    // SQL appears in both directions → context mentions both
    const sqlGap = gaps.find((gap) => gap.skill === 'SQL')!;
    expect(sqlGap.context).toContain('Data Analyst');
    expect(sqlGap.context).toContain('Backend Engineer');
  });
});

describe('compareAssessments', () => {
  it('detects themes that moved into and out of the top three', () => {
    const previous = result({ I: 90, A: 80, S: 70, E: 30 }, {
      id: 'old',
      completed_at: '2026-06-01T00:00:00.000Z',
    });
    const latest = result({ I: 95, E: 85, S: 75, A: 40 }, {
      id: 'new',
      completed_at: '2026-09-01T00:00:00.000Z',
    });

    const comparison = compareAssessments(latest, previous);
    expect(comparison.emergedThemes.map((t) => t.code)).toEqual(['E']);
    expect(comparison.recededLabels).toEqual(['Artistic']);
    expect(comparison.topThreeStable).toBe(false);
    // Biggest move is Enterprising: 30 → 85 (+55)
    expect(comparison.biggestMoves[0]!.code).toBe('E');
    expect(comparison.biggestMoves[0]!.delta).toBe(55);
  });

  it('reports stability when the top three are unchanged and ordered the same', () => {
    const previous = result({ I: 90, A: 80, S: 70 }, { id: 'old', completed_at: '2026-06-01T00:00:00.000Z' });
    const latest = result({ I: 95, A: 82, S: 65 }, { id: 'new', completed_at: '2026-09-01T00:00:00.000Z' });
    const comparison = compareAssessments(latest, previous);
    expect(comparison.topThreeStable).toBe(true);
    expect(comparison.emergedThemes).toEqual([]);
    expect(comparison.recededLabels).toEqual([]);
  });
});
