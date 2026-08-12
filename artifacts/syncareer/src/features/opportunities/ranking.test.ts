import { describe, expect, it } from 'vitest';
import type { OpportunityJob } from './opportunity';
import { rankAndDeduplicateOpportunities } from './ranking';

function makeJob(overrides: Partial<OpportunityJob> = {}): OpportunityJob {
  return {
    id: 'job-1',
    title: 'Graduate role',
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    salary_min: null,
    salary_max: null,
    salary_currency: null,
    description: 'Opportunity description',
    requirements: null,
    skills: [],
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

describe('Opportunity ranking', () => {
  it('puts major-aligned, skill-aligned early-career opportunities ahead of senior and unrelated roles', () => {
    const jobs = [
      makeJob({ id: 'senior', title: 'Senior Software Engineer', experience_level: 'senior', source_url: 'https://example.com/senior' }),
      makeJob({ id: 'aligned', title: 'Graduate Data Analyst', description: 'Use TypeScript and SQL to analyse product data.', source_url: 'https://example.com/aligned' }),
      makeJob({ id: 'unrelated', title: 'Graduate Marketing Assistant', source_url: 'https://example.com/marketing' }),
    ];

    const ranked = rankAndDeduplicateOpportunities(jobs, {
      major: 'Computer Science',
      skills: ['TypeScript', 'SQL'],
      earlyCareer: true,
    });

    expect(ranked.map((result) => result.job.id)).toEqual(['aligned', 'unrelated', 'senior']);
    expect(ranked[0]).toMatchObject({ majorAligned: true, matchedSkillCount: 2 });
  });

  it('keeps one deterministic display row for source URLs that differ only by tracking parameters', () => {
    const older = makeJob({
      id: 'older',
      title: 'Junior Developer',
      source_url: 'https://example.com/jobs/developer?utm_source=partner',
      created_at: '2026-08-10T09:00:00.000Z',
    });
    const newer = makeJob({
      id: 'newer',
      title: 'Junior Developer',
      source_url: 'https://example.com/jobs/developer?utm_medium=email',
      created_at: '2026-08-11T09:00:00.000Z',
    });

    const ranked = rankAndDeduplicateOpportunities([older, newer], { earlyCareer: true });

    expect(ranked).toHaveLength(1);
    expect(ranked[0]?.job.id).toBe('newer');
  });
});
