import { describe, expect, it } from 'vitest';
import type { HardSkill, MarketIntelligence } from '@/hooks/useMarketIntelligence';
import {
  EMPTY_SIGNALS,
  buildMarketConclusion,
  commonRequirements,
  countActiveApplications,
  decliningSkills,
  demandDirection,
  deriveGaps,
  emergingRequirements,
  formatLocalSalary,
  formatReportDate,
  matchHardSkills,
  parseGrowthPercent,
  relevantPostingsForMajor,
  skillMatches,
  type MarketUserSignals,
} from './derive';

function makeSkill(overrides: Partial<HardSkill> = {}): HardSkill {
  return {
    skill: 'Python',
    demand_score: 80,
    growth_percent: '+12%',
    trend: 'rising',
    avg_entry_salary_usd: 0,
    job_posting_volume: 'high',
    ...overrides,
  };
}

function makeReport(skills: HardSkill[] = [], forecast?: MarketIntelligence['demand_forecast']): MarketIntelligence {
  return {
    major: 'Computer Science',
    region: 'accra_ghana',
    hard_skills: skills,
    soft_skills: [],
    salary_data: [],
    demand_forecast: forecast ?? [],
    career_outlook: [],
    market_insights: [],
    region_summary: 'Entry-level software roles are concentrated in fintech and banking.',
    data_confidence: 'medium',
    generated_at: '2026-09-01T10:00:00Z',
    from_cache: true,
  };
}

function signals(overrides: Partial<MarketUserSignals> = {}): MarketUserSignals {
  return { ...EMPTY_SIGNALS, ...overrides };
}

describe('skillMatches (word-boundary)', () => {
  it('matches exact and case-insensitive names', () => {
    expect(skillMatches('Python', 'python')).toBe(true);
    expect(skillMatches('Data Structures', 'data structures')).toBe(true);
  });

  it('matches word-boundary substrings but not embedded substrings', () => {
    expect(skillMatches('SQL', 'SQL & databases')).toBe(true);
    expect(skillMatches('java', 'JavaScript')).toBe(false);
    expect(skillMatches('react', 'React Native')).toBe(true);
  });

  it('rejects noise and trivial inputs', () => {
    expect(skillMatches('', 'Python')).toBe(false);
    expect(skillMatches('js', 'JavaScript')).toBe(false); // too short to be meaningful
    expect(skillMatches('Python', 'Rust')).toBe(false);
  });
});

describe('matchHardSkills', () => {
  const skills = [
    makeSkill({ skill: 'Python', demand_score: 90 }),
    makeSkill({ skill: 'SQL', demand_score: 70 }),
    makeSkill({ skill: 'Docker', demand_score: 55 }),
  ];

  it('splits recorded vs unrecorded and ranks missing by demand', () => {
    const result = matchHardSkills(skills, [{ name: 'python', proficiency: 'intermediate' }]);
    expect(result.matched.map((s) => s.skill)).toEqual(['Python']);
    expect(result.missing.map((s) => s.skill)).toEqual(['SQL', 'Docker']);
  });

  it('avoids false positives across similar names', () => {
    const result = matchHardSkills(
      [makeSkill({ skill: 'JavaScript' })],
      [{ name: 'Java', proficiency: 'advanced' }],
    );
    expect(result.matched).toHaveLength(0);
    expect(result.missing.map((s) => s.skill)).toEqual(['JavaScript']);
  });
});

describe('demandDirection', () => {
  it('prefers the forecast first-vs-last index', () => {
    const rising = makeReport([], [
      { month: 'Jan', demand_index: 40, hiring_activity: 40 },
      { month: 'Dec', demand_index: 70, hiring_activity: 60 },
    ]);
    expect(demandDirection(rising)).toBe('rising');
  });

  it('treats small deltas as stable', () => {
    const stable = makeReport([], [
      { month: 'Jan', demand_index: 50, hiring_activity: 50 },
      { month: 'Dec', demand_index: 52, hiring_activity: 50 },
    ]);
    expect(demandDirection(stable)).toBe('stable');
  });

  it('falls back to skill trends when there is no forecast', () => {
    const declining = makeReport([
      makeSkill({ trend: 'declining' }),
      makeSkill({ trend: 'declining' }),
      makeSkill({ trend: 'rising' }),
    ]);
    expect(demandDirection(declining)).toBe('declining');
  });
});

describe('requirements classification', () => {
  const skills = [
    makeSkill({ skill: 'Python', demand_score: 90, trend: 'rising', growth_percent: '+8%' }),
    makeSkill({ skill: 'SQL', demand_score: 85, trend: 'stable', growth_percent: '+2%' }),
    makeSkill({ skill: 'Docker', demand_score: 70, trend: 'stable', growth_percent: '+1%' }),
    makeSkill({ skill: 'Cloud', demand_score: 60, trend: 'rising', growth_percent: '+20%' }),
    makeSkill({ skill: 'Kubernetes', demand_score: 50, trend: 'rising', growth_percent: '+15%' }),
    makeSkill({ skill: 'jQuery', demand_score: 40, trend: 'declining', growth_percent: '-5%' }),
  ];

  it('picks the most common skills by demand', () => {
    expect(commonRequirements(skills, 4).map((s) => s.skill)).toEqual([
      'Python',
      'SQL',
      'Docker',
      'Cloud',
    ]);
  });

  it('surfaces rising skills outside the common set as emerging', () => {
    expect(emergingRequirements(skills).map((s) => s.skill)).toEqual(['Kubernetes']);
  });

  it('finds declining skills', () => {
    expect(decliningSkills(skills).map((s) => s.skill)).toEqual(['jQuery']);
  });
});

describe('parseGrowthPercent', () => {
  it('parses signed percentages', () => {
    expect(parseGrowthPercent('+12%')).toBe(12);
    expect(parseGrowthPercent('-3%')).toBe(-3);
    expect(parseGrowthPercent('0%')).toBe(0);
  });

  it('returns null for non-numeric labels', () => {
    expect(parseGrowthPercent('n/a')).toBeNull();
  });
});

describe('deriveGaps', () => {
  const skills = [
    makeSkill({ skill: 'Python', demand_score: 90 }),
    makeSkill({ skill: 'SQL', demand_score: 70 }),
  ];
  const postings = [
    { title: 'Backend Engineer', skills: ['Python', 'SQL'] },
    { title: 'Data Analyst', skills: ['SQL'] },
  ];

  it('ranks unrecorded skills by demand and counts matching postings', () => {
    const gaps = deriveGaps(skills, [{ name: 'python', proficiency: 'intermediate' }], postings);
    expect(gaps).toHaveLength(1);
    expect(gaps[0].skill.skill).toBe('SQL');
    expect(gaps[0].postingCount).toBe(2);
  });
});

describe('relevantPostingsForMajor', () => {
  const postings = [
    { title: 'Software Engineer', skills: ['Python'] },
    { title: 'Backend Developer', skills: ['Node'] },
    { title: 'Marketing Intern', skills: ['SEO'] },
  ];

  it('filters to the major role family', () => {
    expect(relevantPostingsForMajor(postings, 'Computer Science').map((p) => p.title)).toEqual([
      'Software Engineer',
      'Backend Developer',
    ]);
  });

  it('returns nothing without a major', () => {
    expect(relevantPostingsForMajor(postings, null)).toEqual([]);
  });
});

describe('buildMarketConclusion', () => {
  const skills = [
    makeSkill({ skill: 'Python', demand_score: 90, trend: 'rising' }),
    makeSkill({ skill: 'SQL', demand_score: 85, trend: 'stable' }),
    makeSkill({ skill: 'Docker', demand_score: 80, trend: 'stable' }),
    makeSkill({ skill: 'Cloud', demand_score: 70, trend: 'rising' }),
    makeSkill({ skill: 'CI/CD', demand_score: 60, trend: 'rising' }),
  ];
  const report = makeReport(skills);
  const user = signals({
    recordedSkills: [
      { name: 'python', proficiency: 'intermediate' },
      { name: 'sql', proficiency: 'beginner' },
    ],
    interests: ['Investigative', 'Realistic'],
    activeApplications: 3,
    postings: [
      { title: 'Backend Engineer', skills: ['Python', 'Docker'] },
      { title: 'DevOps Intern', skills: ['CI/CD'] },
    ],
  });

  it('derives the whole answer from real inputs without inventing figures', () => {
    const conclusion = buildMarketConclusion(report, user);
    expect(conclusion.direction).toBe('rising');
    expect(conclusion.topDemand).toEqual(['Python', 'SQL', 'Docker']);
    expect(conclusion.matched).toEqual(['Python', 'SQL']);
    expect(conclusion.missingOfTopFive).toBe(3);
    expect(conclusion.topGap?.skill).toBe('Docker');
    expect(conclusion.topGap?.postingCount).toBe(1);
    expect(conclusion.interestLabels).toEqual(['Investigative', 'Realistic']);
    expect(conclusion.activeApplications).toBe(3);
    expect(conclusion.marketState).toContain('fintech');
  });

  it('stays honest when nothing is recorded', () => {
    const empty = buildMarketConclusion(report, signals());
    expect(empty.matched).toEqual([]);
    expect(empty.missingOfTopFive).toBe(5);
    expect(empty.topGap?.skill).toBe('Python');
  });
});

describe('countActiveApplications', () => {
  it('excludes terminal states', () => {
    expect(
      countActiveApplications({ pending: 1, interview: 2, rejected: 1, withdrawn: 1, hired: 1 }),
    ).toBe(3);
  });
});

describe('formatLocalSalary', () => {
  it('compacts large values and keeps small ones whole', () => {
    expect(formatLocalSalary(24000, 'GHS')).toBe('GHS 24k');
    expect(formatLocalSalary(4500, 'GHS')).toBe('GHS 4.5k');
    expect(formatLocalSalary(750, 'USD')).toBe('USD 750');
  });

  it('marks missing values without a number', () => {
    expect(formatLocalSalary(0, 'GHS')).toBe('GHS —');
  });
});

describe('formatReportDate', () => {
  it('renders a deterministic date', () => {
    expect(formatReportDate('2026-09-04T10:00:00Z')).toBe('4 Sep 2026');
  });

  it('handles invalid dates', () => {
    expect(formatReportDate('not-a-date')).toBe('Unknown');
  });
});
