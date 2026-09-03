import { describe, expect, it } from 'vitest';
import {
  buildActiveApplications,
  buildCareerJourney,
  buildPreparationItems,
  firstName,
  hasDirection,
  selectNextMove,
  timeOfDayGreeting,
  type DiscoverSnapshot,
} from './discover';
import type { DashboardApplication, DashboardSavedJob } from './continuation';

function app(overrides: Partial<DashboardApplication> = {}): DashboardApplication {
  return {
    id: 'app-1',
    status: 'pending',
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-08-10T10:00:00Z',
    next_action: null,
    next_action_due: null,
    resume_id: null,
    job_title_snapshot: null,
    company_name_snapshot: null,
    job: { id: 'job-1', title: 'Data Analyst', company_name: 'Acme' },
    ...overrides,
  };
}

function saved(overrides: Partial<DashboardSavedJob> = {}): DashboardSavedJob {
  return {
    job_id: 'job-9',
    created_at: '2026-08-09T10:00:00Z',
    job: { id: 'job-9', title: 'Graduate Engineer', company_name: 'Build Co' },
    ...overrides,
  };
}

function snapshot(overrides: Partial<DiscoverSnapshot> = {}): DiscoverSnapshot {
  return {
    fullName: 'Ama Mensah',
    major: null,
    school: null,
    assessmentDone: false,
    direction: null,
    applications: [],
    savedJobs: [],
    cvCompletion: 0,
    interview: { total: 0, lastRole: null, lastAt: null },
    ...overrides,
  };
}

describe('greeting helpers', () => {
  it('returns a time-of-day greeting', () => {
    expect(timeOfDayGreeting(new Date('2026-09-03T08:00:00'))).toBe('Good morning');
    expect(timeOfDayGreeting(new Date('2026-09-03T14:00:00'))).toBe('Good afternoon');
    expect(timeOfDayGreeting(new Date('2026-09-03T20:00:00'))).toBe('Good evening');
  });

  it('extracts a first name or null', () => {
    expect(firstName('Ama Mensah')).toBe('Ama');
    expect(firstName('   ')).toBeNull();
    expect(firstName(null)).toBeNull();
  });
});

describe('hasDirection', () => {
  it('is true only with a real major or completed assessment', () => {
    expect(hasDirection(snapshot())).toBe(false);
    expect(hasDirection(snapshot({ major: 'Computer Science' }))).toBe(true);
    expect(hasDirection(snapshot({ assessmentDone: true }))).toBe(true);
  });
});

describe('selectNextMove', () => {
  it('sends brand-new users with no direction to the assessment', () => {
    const move = selectNextMove(snapshot());
    expect(move.kind).toBe('assessment');
    expect(move.phase).toBe('discover');
    expect(move.href).toBe('/assessment');
  });

  it('sends directed-but-empty users to opportunities', () => {
    const move = selectNextMove(snapshot({ major: 'Computer Science' }));
    expect(move.kind).toBe('opportunity');
    expect(move.href).toBe('/opportunities');
    expect(move.context).toContain('Computer Science');
  });

  it('prioritises building a CV when an active application has none', () => {
    const move = selectNextMove(snapshot({ applications: [app({ status: 'pending' })], cvCompletion: 0 }));
    expect(move.kind).toBe('cv');
    expect(move.phase).toBe('prove');
    expect(move.task).toContain('Data Analyst');
    expect(move.href).toContain('/cv-builder');
  });

  it('moves to interview prep when the application reaches the interview stage', () => {
    const move = selectNextMove(snapshot({ applications: [app({ status: 'interview' })], cvCompletion: 100 }));
    expect(move.kind).toBe('interview');
    expect(move.phase).toBe('advance');
    expect(move.href).toContain('/interview-simulator');
  });

  it('asks the user to record the outcome once an offer exists', () => {
    const move = selectNextMove(snapshot({ applications: [app({ status: 'offered' })], cvCompletion: 100 }));
    expect(move.kind).toBe('application');
    expect(move.href).toContain('/applications');
  });

  it('surfaces a saved opportunity decision when nothing is applied to', () => {
    const move = selectNextMove(snapshot({ savedJobs: [saved()], major: 'Engineering' }));
    expect(move.kind).toBe('saved');
    expect(move.task).toContain('Graduate Engineer');
  });
});

describe('buildCareerJourney', () => {
  it('marks the phase that matches the next move as current', () => {
    const snap = snapshot({ applications: [app({ status: 'interview' })], cvCompletion: 100 });
    const move = selectNextMove(snap);
    const phases = buildCareerJourney(snap, move);
    expect(phases.map((p) => p.key)).toEqual(['discover', 'prove', 'advance']);
    expect(phases.find((p) => p.current)?.key).toBe('advance');
  });

  it('only exposes a numeric progress on Prove (CV completion), never invented scores', () => {
    const snap = snapshot({ cvCompletion: 40 });
    const phases = buildCareerJourney(snap, selectNextMove(snap));
    const prove = phases.find((p) => p.key === 'prove')!;
    expect(prove.progress).toBe(40);
    expect(phases.find((p) => p.key === 'discover')?.progress).toBeNull();
    expect(phases.find((p) => p.key === 'advance')?.progress).toBeNull();
  });

  it('reports honest "not started" states with no data', () => {
    const phases = buildCareerJourney(snapshot(), selectNextMove(snapshot()));
    expect(phases.find((p) => p.key === 'prove')?.state).toBe('Not started');
    expect(phases.find((p) => p.key === 'advance')?.state).toBe('Not started');
  });
});

describe('buildActiveApplications', () => {
  it('returns only active applications, most-recent first, emphasising the focus', () => {
    const active = app({ id: 'a1', status: 'interview', updated_at: '2026-08-12T10:00:00Z' });
    const older = app({ id: 'a2', status: 'pending', updated_at: '2026-08-01T10:00:00Z', job: { id: 'j2', title: 'QA', company_name: 'Q' } });
    const closed = app({ id: 'a3', status: 'rejected', job: { id: 'j3', title: 'Old', company_name: 'X' } });
    const snap = snapshot({ applications: [older, active, closed], cvCompletion: 100 });
    const views = buildActiveApplications(snap, selectNextMove(snap));
    expect(views.map((v) => v.id)).toEqual(['a1', 'a2']);
    expect(views[0].emphasis).toBe(true);
    expect(views[1].emphasis).toBe(false);
  });
});

describe('buildPreparationItems', () => {
  it('reflects real CV/interview/assessment state and emphasises the active step', () => {
    const snap = snapshot({ applications: [app({ status: 'pending' })], cvCompletion: 0 });
    const items = buildPreparationItems(snap, selectNextMove(snap));
    const cv = items.find((i) => i.key === 'cv')!;
    expect(cv.state).toBe('Not started');
    expect(cv.progress).toBeNull();
    expect(cv.emphasis).toBe(true);
    expect(items.find((i) => i.key === 'assessment')?.state).toBe('Not taken');
  });

  it('shows CV completion percentage when partial', () => {
    const items = buildPreparationItems(snapshot({ cvCompletion: 55 }), selectNextMove(snapshot({ cvCompletion: 55 })));
    const cv = items.find((i) => i.key === 'cv')!;
    expect(cv.state).toBe('55% complete');
    expect(cv.progress).toBe(55);
  });
});
