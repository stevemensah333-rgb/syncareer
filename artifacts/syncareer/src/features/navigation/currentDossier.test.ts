import { describe, expect, it } from 'vitest';
import { selectCurrentDossier } from './currentDossier';

describe('selectCurrentDossier', () => {
  it('selects the most recently updated active application', () => {
    expect(selectCurrentDossier([
      { id: 'closed', status: 'rejected', updated_at: '2026-09-02T12:00:00Z', job: { title: 'Closed role', company_name: 'Past Co' } },
      { id: 'older', status: 'pending', updated_at: '2026-08-30T12:00:00Z', job: { title: 'Researcher', company_name: 'North Lab' } },
      { id: 'current', status: 'interview', updated_at: '2026-09-01T12:00:00Z', job: [{ title: 'Data Analyst', company_name: 'Cedar' }] },
    ])).toEqual({
      id: 'current',
      title: 'Data Analyst',
      company: 'Cedar',
      statusLabel: 'Interview',
    });
  });

  it('returns null when no active application can be resolved', () => {
    expect(selectCurrentDossier([{ id: 'closed', status: 'withdrawn', updated_at: '2026-09-01T12:00:00Z' }])).toBeNull();
    expect(selectCurrentDossier(null)).toBeNull();
  });

  it('keeps incomplete posting data truthful', () => {
    expect(selectCurrentDossier([{ id: 'current', status: 'reviewing', updated_at: 'not-a-date', job: null }])).toEqual({
      id: 'current',
      title: 'Tracked application',
      company: null,
      statusLabel: 'Under review',
    });
  });
});
