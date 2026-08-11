import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

export const ASSESSMENT_ANALYTICS_CONSENT_KEY = 'syncareer.assessment_analytics_consent';

export function hasAssessmentAnalyticsConsent(storage: Pick<Storage, 'getItem'> = localStorage): boolean {
  return storage.getItem(ASSESSMENT_ANALYTICS_CONSENT_KEY) === 'granted';
}

export function setAssessmentAnalyticsConsent(granted: boolean, storage: Pick<Storage, 'setItem'> = localStorage): void {
  storage.setItem(ASSESSMENT_ANALYTICS_CONSENT_KEY, granted ? 'granted' : 'denied');
}

export function trackAssessmentLifecycle(event: 'start' | 'progress' | 'abandonment' | 'resume' | 'completion', properties: { answered: number; total: number; elapsedSeconds?: number }, storage?: Pick<Storage, 'getItem'>): void {
  if (!hasAssessmentAnalyticsConsent(storage)) return;
  const percentage = properties.total > 0 ? Math.floor((properties.answered / properties.total) * 100) : 0;
  const bucket = percentage >= 75 ? 75 : percentage >= 50 ? 50 : percentage >= 25 ? 25 : 0;
  if (event === 'start') captureProductEvent(ANALYTICS_EVENTS.ASSESSMENT_STARTED, {});
  else if (event === 'completion') captureProductEvent(ANALYTICS_EVENTS.ASSESSMENT_COMPLETED, {});
  else if (event === 'progress' && bucket > 0) captureProductEvent(ANALYTICS_EVENTS.ASSESSMENT_PROGRESS, { progress_bucket: bucket as 25 | 50 | 75 });
  else if (event === 'abandonment') captureProductEvent(ANALYTICS_EVENTS.ASSESSMENT_ABANDONED, { progress_bucket: bucket });
  else if (event === 'resume') captureProductEvent(ANALYTICS_EVENTS.ASSESSMENT_RESUMED, { progress_bucket: bucket });
}

export const assessmentResumeCapability = {
  supported: false,
  explanation: 'Answers are not saved as a draft. Leaving or refreshing before submission clears progress.',
} as const;
