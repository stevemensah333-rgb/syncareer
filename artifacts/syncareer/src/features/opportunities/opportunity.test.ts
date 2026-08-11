import { describe, it, expect } from 'vitest';
import {
  getOrganisation,
  getWorkModeLabel,
  experienceLevelLabel,
  getDeadlineState,
  deadlineIsUrgent,
  getProvenanceFacts,
  PROVENANCE_NOTE,
  formatPostedAgo,
  getOpportunityCta,
  getIngestionFreshness,
  type OpportunityJobFacts,
} from './opportunity';

const NOW = new Date('2026-08-10T12:00:00Z').getTime();

function job(overrides: Partial<OpportunityJobFacts> = {}): OpportunityJobFacts {
  return {
    title: 'Junior Analyst',
    company_name: 'Acme Ghana',
    department: null,
    location: 'Accra',
    employment_type: 'full-time',
    experience_level: 'entry',
    source: 'jobberman',
    source_url: 'https://example.com/jobs/1',
    application_deadline: null,
    created_at: '2026-08-01T00:00:00Z',
    updated_at: '2026-08-05T00:00:00Z',
    ...overrides,
  };
}

describe('getOrganisation', () => {
  it('prefers company_name and falls back to department, else null', () => {
    expect(getOrganisation(job())).toBe('Acme Ghana');
    expect(getOrganisation(job({ company_name: null, department: 'Finance Dept' }))).toBe('Finance Dept');
    expect(getOrganisation(job({ company_name: '  ', department: null }))).toBeNull();
    expect(getOrganisation(job({ company_name: null, department: null }))).toBeNull();
  });
});

describe('getWorkModeLabel', () => {
  it('detects remote from employment type or location only', () => {
    expect(getWorkModeLabel(job({ employment_type: 'remote' }))).toBe('Remote');
    expect(getWorkModeLabel(job({ employment_type: 'full-time', location: 'Remote - Ghana' }))).toBe('Remote');
    expect(getWorkModeLabel(job())).toBeNull();
    expect(getWorkModeLabel(job({ location: 'Accra', employment_type: null }))).toBeNull();
  });
});

describe('experienceLevelLabel', () => {
  it('maps known levels and never fabricates missing ones', () => {
    expect(experienceLevelLabel('entry')).toBe('Entry level / early career');
    expect(experienceLevelLabel('mid')).toBe('Mid level');
    expect(experienceLevelLabel('senior')).toBe('Senior level');
    expect(experienceLevelLabel('executive')).toBe('Executive');
    expect(experienceLevelLabel(null)).toBeNull();
    expect(experienceLevelLabel('')).toBeNull();
    expect(experienceLevelLabel('  ')).toBeNull();
  });
});

describe('getDeadlineState', () => {
  it('handles a missing deadline without fabricating one', () => {
    const state = getDeadlineState(null, NOW);
    expect(state.kind).toBe('none');
    expect(state.daysLeft).toBeNull();
    expect(state.date).toBeNull();
    expect(state.label).toBe('No deadline listed');
  });

  it('treats unparseable deadlines as missing (partial data)', () => {
    expect(getDeadlineState('not-a-date', NOW).kind).toBe('none');
  });

  it('flags expired deadlines explicitly', () => {
    const state = getDeadlineState('2026-08-01T00:00:00Z', NOW);
    expect(state.kind).toBe('passed');
    expect(state.label).toContain('Deadline passed');
  });

  it('classifies today and near deadlines as urgent', () => {
    const today = getDeadlineState('2026-08-10T18:00:00Z', NOW);
    expect(today.kind).toBe('today');
    expect(deadlineIsUrgent(today)).toBe(true);

    const soon = getDeadlineState('2026-08-15T00:00:00Z', NOW);
    expect(soon.kind).toBe('closing-soon');
    expect(soon.daysLeft).toBe(5);
    expect(deadlineIsUrgent(soon)).toBe(true);
  });

  it('classifies later deadlines as upcoming and non-urgent', () => {
    const state = getDeadlineState('2026-09-01T00:00:00Z', NOW);
    expect(state.kind).toBe('upcoming');
    expect(deadlineIsUrgent(state)).toBe(false);
    expect(state.label).toContain('Deadline');
  });
});

describe('getProvenanceFacts', () => {
  it('always reports verified:false because the schema has no verification evidence', () => {
    const facts = getProvenanceFacts(job());
    expect(facts.verified).toBe(false);
    expect(facts.source).toBe('jobberman');
    expect(facts.sourceLabel).toBe('Jobberman');
    expect(facts.sourceUrl).toBe('https://example.com/jobs/1');
    expect(facts.postedAt).toBe('2026-08-01T00:00:00Z');
  });

  it('falls back honestly when the source is absent', () => {
    const facts = getProvenanceFacts(job({ source: null, source_url: null }));
    expect(facts.sourceLabel).toBe('External source');
    expect(facts.sourceUrl).toBeNull();
    expect(facts.verified).toBe(false);
  });

  it('keeps the provenance note free of verification claims', () => {
    expect(PROVENANCE_NOTE.toLowerCase()).toContain('not independently verified');
    // The note must never phrase verification affirmatively.
    expect(PROVENANCE_NOTE).not.toContain('Verified by Syncareer');
    expect(PROVENANCE_NOTE.toLowerCase()).not.toContain('confirmed current');
  });
});

describe('formatPostedAgo', () => {
  it('formats relative time and returns null for bad input', () => {
    expect(formatPostedAgo('2026-08-10T06:00:00Z', NOW)).toBe('Today');
    expect(formatPostedAgo('2026-08-09T12:00:00Z', NOW)).toBe('Yesterday');
    expect(formatPostedAgo('2026-08-05T12:00:00Z', NOW)).toBe('5d ago');
    expect(formatPostedAgo('2026-07-20T12:00:00Z', NOW)).toBe('3w ago');
    expect(formatPostedAgo(null, NOW)).toBeNull();
    expect(formatPostedAgo('bogus', NOW)).toBeNull();
  });
});

describe('getIngestionFreshness', () => {
  it('labels ingestion timestamps without claiming publication freshness', () => {
    expect(getIngestionFreshness('2026-08-10T06:00:00Z', NOW)).toEqual({
      kind: 'recent', label: 'Listing data ingested today',
    });
    expect(getIngestionFreshness('2026-07-01T00:00:00Z', NOW).kind).toBe('stale');
    expect(getIngestionFreshness(null, NOW)).toEqual({
      kind: 'unknown', label: 'Ingestion freshness unknown',
    });
  });
});

describe('getOpportunityCta', () => {
  it('routes tracked opportunities to the tracker', () => {
    expect(getOpportunityCta({ isExternal: true, hasSourceUrl: true, tracked: true })).toBe('open-tracker');
  });

  it('applies externally only when a source URL exists', () => {
    expect(getOpportunityCta({ isExternal: true, hasSourceUrl: true, tracked: false })).toBe('apply-external');
    expect(getOpportunityCta({ isExternal: true, hasSourceUrl: false, tracked: false })).toBe('source-unavailable');
    expect(getOpportunityCta({ isExternal: false, hasSourceUrl: false, tracked: false })).toBe('apply-native');
  });
});
