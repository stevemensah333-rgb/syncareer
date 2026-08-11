import { describe, expect, it } from 'vitest';
import { applicationFacts, nextActionDueState, ownedWorkspaceLinks, type WorkspaceApplication } from './workspace';

const base = {
  id: 'app-1', job_id: null, status: 'pending', notes: null, resume_url: null,
  created_at: '2026-08-01', updated_at: '2026-08-01', job: null,
  resume_id: null, next_action: null, next_action_due: null,
  job_title_snapshot: 'Durable role', company_name_snapshot: 'Durable Co', source_snapshot: 'Jobberman',
  source_url_snapshot: 'https://example.com/role', location_snapshot: 'Accra', deadline_snapshot: '2026-09-01',
  external_id_snapshot: 'external-1',
} satisfies WorkspaceApplication;

describe('application workspace domain', () => {
  it('uses durable facts when the posting no longer resolves', () => {
    expect(applicationFacts(base)).toMatchObject({ title: 'Durable role', company_name: 'Durable Co', source: 'Jobberman' });
  });

  it('classifies next-action dates without treating a date-only value as UTC', () => {
    const now = new Date(2026, 7, 11, 12);
    expect(nextActionDueState('Follow up', '2026-08-10', now)).toBe('overdue');
    expect(nextActionDueState('Follow up', '2026-08-11', now)).toBe('today');
    expect(nextActionDueState('Follow up', '2026-08-12', now)).toBe('upcoming');
    expect(nextActionDueState(null, '2026-08-10', now)).toBe('none');
  });

  it('filters link choices to the authenticated owner as defence in depth', () => {
    expect(ownedWorkspaceLinks([{ id: 'own', user_id: 'u1' }, { id: 'other', user_id: 'u2' }], 'u1'))
      .toEqual([{ id: 'own', user_id: 'u1' }]);
  });
});
