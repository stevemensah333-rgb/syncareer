import { describe, expect, it } from 'vitest';
import type { OpportunityJob } from './opportunity';
import type { OpportunityProfileSignals } from './ranking';
import { rankAndDeduplicateOpportunities } from './ranking';
import { buildFitExplanation, hasProfileSignals } from './fit';

function makeJob(overrides: Partial<OpportunityJob> = {}): OpportunityJob {
  return {
    id: 'job-1',
    title: 'Graduate Data Analyst',
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: 'Analyse product data with Python and SQL.',
    requirements: null,
    skills: ['Python', 'SQL', 'Cloud deployment'],
    created_at: '2026-08-12T09:00:00.000Z',
    employer_id: null,
    source: 'jobberman',
    source_url: 'https://example.com/jobs/1',
    is_external: true,
    application_deadline: null,
    company_name: 'Acme',
    company_domain: null,
    experience_level: 'entry',
    external_id: null,
    status: 'active',
    updated_at: '2026-08-12T09:00:00.000Z',
    ...overrides,
  };
}

const PROFILE: OpportunityProfileSignals = {
  major: 'Data Science',
  skills: ['Python', 'FastAPI', 'SQL'],
  interests: ['Data'],
  earlyCareer: true,
};

function rankAndExplain(job: OpportunityJob, profile: OpportunityProfileSignals) {
  const [ranked] = rankAndDeduplicateOpportunities([job], profile);
  return buildFitExplanation(job, ranked!, profile);
}

describe('hasProfileSignals', () => {
  it('is false with no real personalization data', () => {
    expect(hasProfileSignals({})).toBe(false);
    expect(hasProfileSignals({ major: '', skills: [], interests: [] })).toBe(false);
  });

  it('is true for any single real signal', () => {
    expect(hasProfileSignals({ skills: ['Python'] })).toBe(true);
    expect(hasProfileSignals({ major: 'Computer Science' })).toBe(true);
    expect(hasProfileSignals({ interests: ['Data'] })).toBe(true);
  });
});

describe('buildFitExplanation', () => {
  it('returns null when the student has no personalization signals at all', () => {
    const job = makeJob();
    const [ranked] = rankAndDeduplicateOpportunities([job], {});
    expect(buildFitExplanation(job, ranked!, {})).toBeNull();
  });

  it('explains a strong fit from recorded skills named in the posting', () => {
    const fit = rankAndExplain(makeJob(), PROFILE)!;

    expect(fit).not.toBeNull();
    expect(fit.label).toBe('Strong fit');
    expect(fit.reasons).toEqual(
      expect.arrayContaining([
        { source: 'skill', text: 'Recorded skills · Python, SQL' },
        { source: 'interest', text: 'Your interests · Data' },
      ]),
    );
  });

  it('names real gaps from listing skills that are not recorded — never a score', () => {
    const fit = rankAndExplain(makeJob(), PROFILE)!;

    expect(fit.gaps.map((gap) => gap.skill)).toContain('Cloud deployment');
    expect(fit.gaps[0]?.note).toBe('Listed by the source; not in your recorded skills');
  });

  it('does not call a gap when the skill is already recorded', () => {
    const fit = rankAndExplain(
      makeJob({ skills: ['Python', 'SQL'] }),
      PROFILE,
    )!;

    expect(fit.gaps).toHaveLength(0);
  });

  it('does not manufacture a fit from generic early-career language alone', () => {
    const fit = rankAndExplain(
      makeJob({ title: 'Graduate Trainee', skills: null }),
      { earlyCareer: true } satisfies OpportunityProfileSignals,
    );

    expect(fit).toBeNull();
  });

  it('never exposes a percentage or score number in the explanation', () => {
    const fit = rankAndExplain(makeJob(), PROFILE)!;

    expect(fit.label).not.toMatch(/\d+/);
    expect(JSON.stringify(fit)).not.toMatch(/\d{2}%/);
  });
});
