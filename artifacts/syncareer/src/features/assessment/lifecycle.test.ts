import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assessmentResumeCapability, hasAssessmentAnalyticsConsent, setAssessmentAnalyticsConsent, trackAssessmentLifecycle } from './lifecycle';
import { trackEvent } from '@/services/analytics';

vi.mock('@/services/analytics', () => ({ EVENTS: { ASSESSMENT_STARTED: 'assessment_started', ASSESSMENT_QUESTION_PROGRESS: 'assessment_question_progress', ASSESSMENT_COMPLETED: 'assessment_completed', ASSESSMENT_ABANDONED: 'assessment_abandoned', ASSESSMENT_RESUMED: 'assessment_resumed' }, trackEvent: vi.fn() }));

function storage(initial?: string) { let value = initial ?? null; return { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next; }) }; }

describe('assessment lifecycle analytics', () => {
  beforeEach(() => vi.clearAllMocks());
  it('is opt-in and never sends answers or result themes', () => {
    const denied = storage('denied');
    trackAssessmentLifecycle('progress', { answered: 7, total: 45 }, denied);
    expect(trackEvent).not.toHaveBeenCalled();
    const granted = storage('granted');
    trackAssessmentLifecycle('progress', { answered: 7, total: 45 }, granted);
    expect(trackEvent).toHaveBeenCalledWith('assessment_question_progress', { answered_count: 7, total_questions: 45 });
  });
  it('stores an explicit consent choice', () => {
    const target = storage(); setAssessmentAnalyticsConsent(true, target);
    expect(hasAssessmentAnalyticsConsent(target)).toBe(true);
  });
  it('honestly reports that cross-refresh resume is unavailable', () => {
    expect(assessmentResumeCapability.supported).toBe(false);
    expect(assessmentResumeCapability.explanation).toMatch(/not saved.*refreshing.*clears/i);
  });
});
