import { describe, it, expect } from 'vitest';
import {
  calculateTotalProgress,
  getMilestones,
  getMilestoneDetails,
  getNextAction,
  type UserProgress,
} from './progressCalculations';

/** Matrix 1.4 — Deterministic progress %, milestones and next-action ordering. */

function progress(overrides: Partial<UserProgress> = {}): UserProgress {
  return {
    userId: 'u1',
    profileCompletion: 0,
    profileItems: [],
    assessmentCompletion: 0,
    assessmentCount: 0,
    assessmentCompleted: 0,
    totalCompletion: 0,
    lastUpdated: new Date(),
    milestones: [],
    ...overrides,
  };
}

describe('calculateTotalProgress', () => {
  it('is 0 for a fresh profile with no assessment', () => {
    expect(calculateTotalProgress(progress())).toBe(0);
  });

  it('awards the jobs weight once an assessment is completed', () => {
    const p = progress({ assessmentCompleted: 1 });
    expect(calculateTotalProgress(p)).toBe(Math.round(50 * 0.33)); // 17
  });

  it('caps below 100 because the jobs pillar peaks at 50 (documented)', () => {
    // profile 100*0.34=34 + assessment 100*0.33=33 + jobs 50*0.33=16.5 → 83.5 → 84.
    // The 'syncareer-ready' milestone is therefore not reachable today.
    const p = progress({
      profileCompletion: 100,
      assessmentCompletion: 100,
      assessmentCompleted: 1,
    });
    expect(calculateTotalProgress(p)).toBe(84);
    expect(calculateTotalProgress(p)).toBeLessThan(100);
  });
});

describe('getMilestones', () => {
  it('awards no milestones for a fresh user', () => {
    expect(getMilestones(progress())).toEqual([]);
  });

  it('awards first-assessment at >= 1 completed assessment', () => {
    expect(getMilestones(progress({ assessmentCompleted: 1 }))).toContain('first-assessment');
  });

  it('awards assessment-explorer at >= 3 assessments', () => {
    expect(getMilestones(progress({ assessmentCompleted: 3 }))).toContain('assessment-explorer');
  });

  it('does not award the unreachable syncareer-ready milestone (documented)', () => {
    // calculateTotalProgress maxes at 84 today, so syncareer-ready (==100) is
    // dead logic. The guard below pins this so a weighting fix is a deliberate
    // change rather than a silent drift.
    const p = progress({
      profileCompletion: 100,
      assessmentCompletion: 100,
      assessmentCompleted: 1,
    });
    const m = getMilestones(p);
    expect(m).toContain('profile-complete');
    expect(m).not.toContain('syncareer-ready');
  });
});

describe('getMilestoneDetails', () => {
  it('returns details for known milestones', () => {
    expect(getMilestoneDetails('profile-complete')?.label).toBe('Profile Complete');
    expect(getMilestoneDetails('nope')).toBeNull();
  });
});

describe('getNextAction', () => {
  it('prioritises profile completion', () => {
    const n = getNextAction(progress({ profileCompletion: 40 }));
    expect(n?.action).toBe('Complete Profile');
    expect(n?.urgency).toBe('high');
  });

  it('prioritises taking an assessment next', () => {
    const n = getNextAction(progress({ profileCompletion: 100, assessmentCompleted: 0 }));
    expect(n?.action).toBe('Take Assessment');
  });

  it('returns null once sufficiently progressed', () => {
    const n = getNextAction(progress({ profileCompletion: 100, assessmentCompleted: 3 }));
    expect(n).toBeNull();
  });
});
