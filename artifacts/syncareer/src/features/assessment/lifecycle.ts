import { EVENTS, trackEvent } from '@/services/analytics';

export const ASSESSMENT_ANALYTICS_CONSENT_KEY = 'syncareer.assessment_analytics_consent';

export function hasAssessmentAnalyticsConsent(storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  return storage.getItem(ASSESSMENT_ANALYTICS_CONSENT_KEY) === 'granted';
}

export function setAssessmentAnalyticsConsent(granted: boolean, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(ASSESSMENT_ANALYTICS_CONSENT_KEY, granted ? 'granted' : 'denied');
}

export function trackAssessmentLifecycle(event: 'start' | 'progress' | 'abandonment' | 'resume' | 'completion', properties: { answered: number; total: number; elapsedSeconds?: number }, storage?: Pick<Storage, 'getItem'>): void {
  if (!hasAssessmentAnalyticsConsent(storage)) return;
  const eventName = event === 'start' ? EVENTS.ASSESSMENT_STARTED : event === 'completion' ? EVENTS.ASSESSMENT_COMPLETED : event === 'abandonment' ? EVENTS.ASSESSMENT_ABANDONED : event === 'resume' ? EVENTS.ASSESSMENT_RESUMED : EVENTS.ASSESSMENT_QUESTION_PROGRESS;
  trackEvent(eventName, { answered_count: properties.answered, total_questions: properties.total, ...(properties.elapsedSeconds === undefined ? {} : { elapsed_seconds: properties.elapsedSeconds }) });
}

export const assessmentResumeCapability = {
  supported: false,
  explanation: 'Answers are not saved as a draft. Leaving or refreshing before submission clears progress.',
} as const;
