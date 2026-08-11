import { describe, expect, it } from 'vitest';
import { dashboardDataState, selectPrimaryFocus, type DashboardApplication, type DashboardSavedJob } from './continuation';

const active = (overrides: Partial<DashboardApplication> = {}): DashboardApplication => ({
  id: 'app-1', status: 'pending', created_at: '2026-08-01T00:00:00Z', updated_at: '2026-08-08T00:00:00Z',
  next_action: null, next_action_due: null, resume_id: null, job_title_snapshot: 'Analyst', company_name_snapshot: 'Acme', job: null,
  ...overrides,
});
const saved = (overrides: Partial<DashboardSavedJob> = {}): DashboardSavedJob => ({
  job_id: 'job-1', created_at: '2026-08-09T00:00:00Z',
  job: { id: 'job-1', title: 'Graduate Analyst', company_name: 'Example Co' }, ...overrides,
});
const now = new Date('2026-08-11T12:00:00Z');

describe('dashboard continuation selection', () => {
  it('starts with a real opportunity for a new user or when no data is available', () => {
    expect(selectPrimaryFocus([], [], now)).toEqual({ type: 'start' });
  });

  it('continues a saved opportunity when there is no active application', () => {
    expect(selectPrimaryFocus([], [saved()], now)).toMatchObject({ type: 'saved', data: { job_id: 'job-1' } });
  });

  it('prefers an active application over saved opportunities', () => {
    expect(selectPrimaryFocus([active()], [saved()], now)).toMatchObject({ type: 'application', data: { id: 'app-1' } });
  });

  it('prioritises an overdue next action over a more recently updated application', () => {
    const overdue = active({ id: 'overdue', next_action: 'Follow up', next_action_due: '2026-08-10', updated_at: '2026-08-01T00:00:00Z' });
    const recent = active({ id: 'recent', updated_at: '2026-08-11T00:00:00Z' });
    expect(selectPrimaryFocus([recent, overdue], [], now)).toMatchObject({ type: 'application', data: { id: 'overdue' } });
  });

  it('uses the earliest dated next action, then the latest update', () => {
    const later = active({ id: 'later', next_action: 'Prepare', next_action_due: '2026-08-20' });
    const sooner = active({ id: 'sooner', next_action: 'Email', next_action_due: '2026-08-13' });
    expect(selectPrimaryFocus([later, sooner], [], now)).toMatchObject({ data: { id: 'sooner' } });
    expect(selectPrimaryFocus([active({ id: 'old', updated_at: '2026-08-01' }), active({ id: 'new', updated_at: '2026-08-10' })], [], now)).toMatchObject({ data: { id: 'new' } });
  });

  it('does not promote terminal applications or already-tracked saved jobs', () => {
    const terminal = active({ status: 'rejected', job: { id: 'job-1', title: 'Closed role' } });
    expect(selectPrimaryFocus([terminal], [saved()], now)).toEqual({ type: 'start' });
  });

  it('distinguishes partial panel failure from unavailable continuation data', () => {
    expect(dashboardDataState([])).toBe('ready');
    expect(dashboardDataState(['CV'])).toBe('partial');
    expect(dashboardDataState(['applications'])).toBe('unavailable');
    expect(dashboardDataState(['applications', 'saved opportunities'])).toBe('unavailable');
    expect(dashboardDataState(['dashboard'])).toBe('unavailable');
  });
});
