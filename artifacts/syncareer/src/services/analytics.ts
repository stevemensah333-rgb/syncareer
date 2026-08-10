import posthog from 'posthog-js';

/**
 * Event tracking constants - all analytics events in the app
 */
export const EVENTS = {
  // Auth
  SIGN_UP_STARTED: 'sign_up_started',
  SIGN_UP_COMPLETED: 'sign_up_completed',
  SIGN_IN_COMPLETED: 'sign_in_completed',
  SIGN_OUT_COMPLETED: 'sign_out_completed',
  PASSWORD_RESET: 'password_reset',

  // Onboarding
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_SKIPPED: 'onboarding_skipped',

  // Assessment
  ASSESSMENT_STARTED: 'assessment_started',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  ASSESSMENT_ABANDONED: 'assessment_abandoned',

  // CV Builder
  CV_BUILDER_OPENED: 'cv_builder_opened',
  CV_SECTION_COMPLETED: 'cv_section_completed',
  CV_SAVED: 'cv_saved',
  CV_DOWNLOADED: 'cv_downloaded',

  // Interview Simulator
  INTERVIEW_STARTED: 'interview_started',
  INTERVIEW_COMPLETED: 'interview_completed',
  INTERVIEW_QUESTION_ANSWERED: 'interview_question_answered',

  // Job Applications
  JOB_VIEW: 'job_view',
  JOB_APPLY: 'job_apply',
  APPLICATION_STATUS_UPDATE: 'application_status_update',

  // Feature Usage
  FEATURE_ACCESSED: 'feature_accessed',
  HELP_VIEWED: 'help_viewed',
  TOUR_STARTED: 'tour_started',
  TOUR_COMPLETED: 'tour_completed',
  TOUR_SKIPPED: 'tour_skipped',

  // Subscription
  SUBSCRIPTION_INITIATED: 'subscription_initiated',
  SUBSCRIPTION_COMPLETED: 'subscription_completed',
  SUBSCRIPTION_CANCELLED: 'subscription_cancelled',

  // Error events
  ERROR_OCCURRED: 'error_occurred',
  PAGE_ERROR: 'page_error',

  // Performance
  PAGE_LOAD: 'page_load',
  API_CALL: 'api_call',
  API_ERROR: 'api_error',
} as const;

// Event tracking types
export type TrackableEvent = 
  | { event: 'page_view'; properties: { page_name: string; path?: string; [key: string]: unknown } }
  | { event: 'user_signup'; properties: { user_type: string; [key: string]: unknown } }
  | { event: 'user_signin'; properties: { method: string; [key: string]: unknown } }
  | { event: 'feature_opened'; properties: { feature_name: string; feature_id?: string; [key: string]: unknown } }
  | { event: 'assessment_started'; properties: { assessment_type: string; [key: string]: unknown } }
  | { event: 'assessment_completed'; properties: { assessment_type: string; score?: number; duration_seconds?: number; [key: string]: unknown } }
  | { event: 'cv_section_added'; properties: { section_type: string; order?: number; [key: string]: unknown } }
  | { event: 'cv_section_completed'; properties: { section_type: string; [key: string]: unknown } }
  | { event: 'tour_started'; properties: { tour_type: string; [key: string]: unknown } }
  | { event: 'tour_completed'; properties: { tour_type: string; steps_completed: number; [key: string]: unknown } }
  | { event: 'tour_skipped'; properties: { tour_type: string; step_current?: number; [key: string]: unknown } }
  | { event: 'help_tooltip_clicked'; properties: { tooltip_id: string; feature_name: string; [key: string]: unknown } }
  | { event: 'notification_viewed'; properties: { notification_type: string; [key: string]: unknown } }
  | { event: 'notification_clicked'; properties: { notification_type: string; action: string; [key: string]: unknown } }
  | { event: 'referral_copied'; properties: Record<string, unknown> }
  | { event: 'referral_clicked'; properties: { source: string; [key: string]: unknown } }
  | { event: 'profile_progress_updated'; properties: { completion_percent: number; section?: string; [key: string]: unknown } }
  | { event: 'form_submitted'; properties: { form_name: string; fields_completed: number; [key: string]: unknown } }
  | { event: 'form_error'; properties: { form_name: string; error_type: string; [key: string]: unknown } }
  | { event: 'api_error'; properties: { endpoint: string; status_code: number; error_message: string; [key: string]: unknown } }
  | { event: 'feature_error'; properties: { feature_name: string; error_message: string; [key: string]: unknown } }
  | { event: 'user_action'; properties: { action_name: string; context?: string; [key: string]: unknown } }
  | { event: string; properties?: Record<string, unknown> };

/**
 * Initialize PostHog analytics
 */
export const initializeAnalytics = (userId?: string): void => {
  try {
    const posthogApiKey = import.meta.env.VITE_POSTHOG_API_KEY;
    if (posthogApiKey) {
      posthog.init(posthogApiKey, {
        api_host: 'https://us.posthog.com',
        loaded: (ph) => {
          if (userId) {
            ph.identify(userId, { userId });
          }
        },
      });
    }
  } catch (error) {
    console.error('[Analytics] Error initializing analytics:', error);
  }
};

/**
 * Track an analytics event.
 * Supports both object payload `{ event, properties }` and `(eventName, properties)`.
 */
export function trackEvent(
  eventOrName: TrackableEvent | string,
  properties?: Record<string, unknown>
): void {
  try {
    if (typeof eventOrName === 'string') {
      posthog.capture(eventOrName, properties);
    } else {
      posthog.capture(eventOrName.event, eventOrName.properties);
    }
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
}

/**
 * Set user properties for analytics
 */
export const setUserProperties = (properties: Record<string, unknown>): void => {
  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Error setting user properties:', error);
  }
};

/**
 * Identify a user
 */
export const identifyUser = (userId: string, properties?: Record<string, unknown>): void => {
  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
};

/**
 * Reset analytics (for logout)
 */
export const resetAnalytics = (): void => {
  try {
    posthog.reset();
  } catch (error) {
    console.error('[Analytics] Error resetting analytics:', error);
  }
};

/**
 * Track page view.
 * Supports both `(pageName, path)` and `(pageName, properties)`.
 */
export const trackPageView = (
  pageName: string,
  pathOrProperties?: string | Record<string, unknown>,
  properties?: Record<string, unknown>
): void => {
  const path = typeof pathOrProperties === 'string' ? pathOrProperties : (properties?.path as string) || '';
  const extraProps = typeof pathOrProperties === 'object' ? pathOrProperties : properties || {};
  trackEvent({
    event: 'page_view',
    properties: { page_name: pageName, path, ...extraProps },
  });
};

/**
 * Convenience tracking helper functions
 */
export function trackSignUp(method: 'email' | 'google' | 'github'): void {
  trackEvent(EVENTS.SIGN_UP_STARTED, { method });
}

export function trackSignUpCompleted(userType: string): void {
  trackEvent(EVENTS.SIGN_UP_COMPLETED, { user_type: userType });
}

export function trackSignIn(method: 'email' | 'google' | 'github'): void {
  trackEvent(EVENTS.SIGN_IN_COMPLETED, { method });
}

export function trackSignOut(): void {
  trackEvent(EVENTS.SIGN_OUT_COMPLETED);
}

export function trackFeatureAccess(featureName: string): void {
  trackEvent(EVENTS.FEATURE_ACCESSED, { feature: featureName });
}

export function trackTourStarted(tourType: string): void {
  trackEvent(EVENTS.TOUR_STARTED, { tour_type: tourType });
}

export function trackTourCompleted(tourType: string): void {
  trackEvent(EVENTS.TOUR_COMPLETED, { tour_type: tourType });
}

export function trackTourSkipped(tourType: string): void {
  trackEvent(EVENTS.TOUR_SKIPPED, { tour_type: tourType });
}

export function trackAssessmentStarted(): void {
  trackEvent(EVENTS.ASSESSMENT_STARTED);
}

export function trackAssessmentCompleted(score: number, timeSpent: number): void {
  trackEvent(EVENTS.ASSESSMENT_COMPLETED, { score, time_spent_seconds: timeSpent });
}

export function trackCVSectionCompleted(sectionName: string): void {
  trackEvent(EVENTS.CV_SECTION_COMPLETED, { section: sectionName });
}

export function trackCVSaved(): void {
  trackEvent(EVENTS.CV_SAVED);
}

export function trackCVDownloaded(format: string): void {
  trackEvent(EVENTS.CV_DOWNLOADED, { format });
}

export function trackInterviewStarted(): void {
  trackEvent(EVENTS.INTERVIEW_STARTED);
}

export function trackInterviewCompleted(questionsAnswered: number, timeSpent: number): void {
  trackEvent(EVENTS.INTERVIEW_COMPLETED, {
    questions_answered: questionsAnswered,
    time_spent_seconds: timeSpent,
  });
}

export function trackJobView(jobId: string, jobTitle: string): void {
  trackEvent(EVENTS.JOB_VIEW, { job_id: jobId, job_title: jobTitle });
}

export function trackJobApply(jobId: string, jobTitle: string): void {
  trackEvent(EVENTS.JOB_APPLY, { job_id: jobId, job_title: jobTitle });
}

export function trackSubscriptionInitiated(plan: string): void {
  trackEvent(EVENTS.SUBSCRIPTION_INITIATED, { plan });
}

export function trackSubscriptionCompleted(plan: string, amount: number): void {
  trackEvent(EVENTS.SUBSCRIPTION_COMPLETED, { plan, amount });
}

export function trackError(errorMessage: string, errorCode?: string): void {
  trackEvent(EVENTS.ERROR_OCCURRED, {
    error_message: errorMessage,
    error_code: errorCode,
  });
}

export function trackAPICall(endpoint: string, method: string, responseTime: number, success: boolean): void {
  if (success) {
    trackEvent(EVENTS.API_CALL, {
      endpoint,
      method,
      response_time_ms: responseTime,
    });
  } else {
    trackEvent(EVENTS.API_ERROR, {
      endpoint,
      method,
      response_time_ms: responseTime,
    });
  }
}

export function trackWebVitals(metric: string, value: number): void {
  trackEvent('web_vital', {
    metric,
    value,
  });
}
