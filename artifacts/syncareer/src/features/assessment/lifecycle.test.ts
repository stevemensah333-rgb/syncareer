import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assessmentResumeCapability, hasAssessmentAnalyticsConsent, setAssessmentAnalyticsConsent, trackAssessmentLifecycle } from './lifecycle';
import { ANALYTICS_EVENTS } from '@/services/analyticsEvents';

const captureMock = vi.fn();
vi.mock('@/services/analytics', () => ({
  ANALYTICS_EVENTS: {
    ASSESSMENT_STARTED: 'assessment_started',
    ASSESSMENT_PROGRESS: 'assessment_progress',
    ASSESSMENT_ABANDONED: 'assessment_abandoned',
    ASSESSMENT_RESUMED: 'assessment_resumed',
    ASSESSMENT_COMPLETED: 'assessment_completed',
  },
  captureProductEvent: (...args: any[]) => captureMock(...args),
}));

function storage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, next: string) => {
      value = next;
    }),
  };
}

describe('assessment lifecycle analytics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('is opt-in and never sends answers or result themes', () => {
    const denied = storage('denied');
    trackAssessmentLifecycle('progress', { answered: 7, total: 45 }, denied);
    expect(captureMock).not.toHaveBeenCalled();

    const granted = storage('granted');
    // 7/45 ~15% => bucket 0, progress event filtered out by implementation (only bucket >0 emits)
    trackAssessmentLifecycle('progress', { answered: 7, total: 45 }, granted);
    expect(captureMock).not.toHaveBeenCalled();

    // 30/45 ~66% => bucket 50 should emit
    trackAssessmentLifecycle('progress', { answered: 30, total: 45 }, granted);
    expect(captureMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.ASSESSMENT_PROGRESS, { progress_bucket: 50 });

    // Ensure no answer content leaked — only coarse numbers/strings
    const calls = captureMock.mock.calls.flatMap((c) => Object.values(c[1] ?? {}));
    for (const v of calls) {
      expect(typeof v).not.toBe('object');
    }
  });

  it('maps abandoned and resumed to coarse buckets', () => {
    const granted = storage('granted');
    trackAssessmentLifecycle('abandonment', { answered: 40, total: 45 }, granted);
    expect(captureMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.ASSESSMENT_ABANDONED, { progress_bucket: 75 });
    captureMock.mockClear();
    trackAssessmentLifecycle('resume', { answered: 10, total: 45 }, granted);
    expect(captureMock).toHaveBeenCalledWith(ANALYTICS_EVENTS.ASSESSMENT_RESUMED, { progress_bucket: 0 });
  });

  it('stores an explicit consent choice', () => {
    const target = storage();
    setAssessmentAnalyticsConsent(true, target);
    expect(hasAssessmentAnalyticsConsent(target)).toBe(true);
    setAssessmentAnalyticsConsent(false, target);
    expect(hasAssessmentAnalyticsConsent(target)).toBe(false);
  });

  it('honestly reports that cross-refresh resume is unavailable', () => {
    expect(assessmentResumeCapability.supported).toBe(false);
    expect(assessmentResumeCapability.explanation).toMatch(/not saved.*refreshing.*clears/i);
  });
});
