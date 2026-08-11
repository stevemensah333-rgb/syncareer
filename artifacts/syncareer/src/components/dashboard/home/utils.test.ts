import { describe, it, expect } from 'vitest';
import {
  statusLabel,
  isActiveStatus,
  getDaysUntilDeadline,
  getDeadlineLabel,
  getActionDueLabel,
  scoreResume,
  nextStepForApplicationStatus,
  timeAgo,
} from './utils';

describe('home utils', () => {
  it('maps status labels', () => {
    expect(statusLabel('pending')).toBe('Applied');
    expect(statusLabel('reviewing')).toBe('Under review');
    expect(statusLabel('interview')).toBe('Interview');
    expect(statusLabel('custom')).toBe('Custom');
  });

  it('detects active statuses', () => {
    expect(isActiveStatus('pending')).toBe(true);
    expect(isActiveStatus('offered')).toBe(true);
    expect(isActiveStatus('rejected')).toBe(false);
    expect(isActiveStatus('withdrawn')).toBe(false);
  });

  it('computes days until deadline', () => {
    const future = new Date(Date.now() + 3 * 86400000).toISOString();
    const days = getDaysUntilDeadline(future);
    expect(days).not.toBeNull();
    expect(days!).toBeGreaterThanOrEqual(2);
    expect(days!).toBeLessThanOrEqual(4);
    expect(getDaysUntilDeadline(null)).toBeNull();
  });

  it('labels deadline urgency', () => {
    expect(getDeadlineLabel(0)?.tone).toBe('urgent');
    expect(getDeadlineLabel(1)?.label).toContain('tomorrow');
    expect(getDeadlineLabel(2)?.tone).toBe('urgent');
    expect(getDeadlineLabel(5)?.tone).toBe('soon');
    expect(getDeadlineLabel(20)?.tone).toBe('ok');
    expect(getDeadlineLabel(-1)).toBeNull();
    expect(getDeadlineLabel(null)).toBeNull();
  });

  it('labels overdue and upcoming next actions without hiding overdue work', () => {
    expect(getActionDueLabel(-3)).toEqual({ label: '3 days overdue', tone: 'urgent' });
    expect(getActionDueLabel(0)?.label).toBe('Due today');
    expect(getActionDueLabel(4)?.tone).toBe('soon');
  });

  it('scores resume honestly — empty is 0', () => {
    expect(scoreResume(null)).toBe(0);
    expect(scoreResume({})).toBe(0);
    expect(scoreResume({ personal_info: { fullName: 'Ama', email: 'a@b.com' } })).toBeGreaterThan(0);
  });

  it('derives next step per status without generic AI prompts', () => {
    const pending = nextStepForApplicationStatus('pending', 'Software Engineer');
    expect(pending.title.toLowerCase()).toContain('review');
    expect(pending.href).toBeTruthy();
    const interview = nextStepForApplicationStatus('interview', 'Data Analyst');
    expect(interview.href).toContain('interview-simulator');
    const offered = nextStepForApplicationStatus('offered', 'PM');
    expect(offered.href).toContain('applications');
  });

  it('formats timeAgo without inventing', () => {
    const today = new Date().toISOString();
    expect(timeAgo(today)).toBe('Today');
  });
});
