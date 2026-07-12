import PostHog from 'posthog-js';

/**
 * Event tracking constants - all analytics events in the app
 */

// Authentication events
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
};

/**
 * Track a user event
 */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  if (!PostHog.isFeatureEnabled) {
    console.warn('[Analytics] PostHog not initialized');
    return;
  }
  PostHog.capture(eventName, properties);
}

/**
 * Track page view
 */
export function trackPageView(pageName: string, properties?: Record<string, unknown>) {
  trackEvent('$pageview', {
    page_name: pageName,
    ...properties,
  });
}

/**
 * Track authentication events
 */
export function trackSignUp(method: 'email' | 'google' | 'github') {
  trackEvent(EVENTS.SIGN_UP_STARTED, { method });
}

export function trackSignUpCompleted(userType: string) {
  trackEvent(EVENTS.SIGN_UP_COMPLETED, { user_type: userType });
}

export function trackSignIn(method: 'email' | 'google' | 'github') {
  trackEvent(EVENTS.SIGN_IN_COMPLETED, { method });
}

export function trackSignOut() {
  trackEvent(EVENTS.SIGN_OUT_COMPLETED);
}

/**
 * Track feature usage
 */
export function trackFeatureAccess(featureName: string) {
  trackEvent(EVENTS.FEATURE_ACCESSED, { feature: featureName });
}

/**
 * Track tour events
 */
export function trackTourStarted(tourType: string) {
  trackEvent(EVENTS.TOUR_STARTED, { tour_type: tourType });
}

export function trackTourCompleted(tourType: string) {
  trackEvent(EVENTS.TOUR_COMPLETED, { tour_type: tourType });
}

export function trackTourSkipped(tourType: string) {
  trackEvent(EVENTS.TOUR_SKIPPED, { tour_type: tourType });
}

/**
 * Track assessment events
 */
export function trackAssessmentStarted() {
  trackEvent(EVENTS.ASSESSMENT_STARTED);
}

export function trackAssessmentCompleted(score: number, timeSpent: number) {
  trackEvent(EVENTS.ASSESSMENT_COMPLETED, { score, time_spent_seconds: timeSpent });
}

/**
 * Track CV builder events
 */
export function trackCVSectionCompleted(sectionName: string) {
  trackEvent(EVENTS.CV_SECTION_COMPLETED, { section: sectionName });
}

export function trackCVSaved() {
  trackEvent(EVENTS.CV_SAVED);
}

export function trackCVDownloaded(format: string) {
  trackEvent(EVENTS.CV_DOWNLOADED, { format });
}

/**
 * Track interview simulator events
 */
export function trackInterviewStarted() {
  trackEvent(EVENTS.INTERVIEW_STARTED);
}

export function trackInterviewCompleted(questionsAnswered: number, timeSpent: number) {
  trackEvent(EVENTS.INTERVIEW_COMPLETED, {
    questions_answered: questionsAnswered,
    time_spent_seconds: timeSpent,
  });
}

/**
 * Track job application events
 */
export function trackJobView(jobId: string, jobTitle: string) {
  trackEvent(EVENTS.JOB_VIEW, { job_id: jobId, job_title: jobTitle });
}

export function trackJobApply(jobId: string, jobTitle: string) {
  trackEvent(EVENTS.JOB_APPLY, { job_id: jobId, job_title: jobTitle });
}

/**
 * Track subscription events
 */
export function trackSubscriptionInitiated(plan: string) {
  trackEvent(EVENTS.SUBSCRIPTION_INITIATED, { plan });
}

export function trackSubscriptionCompleted(plan: string, amount: number) {
  trackEvent(EVENTS.SUBSCRIPTION_COMPLETED, { plan, amount });
}

/**
 * Track errors
 */
export function trackError(errorMessage: string, errorCode?: string) {
  trackEvent(EVENTS.ERROR_OCCURRED, {
    error_message: errorMessage,
    error_code: errorCode,
  });
}

/**
 * Track API performance
 */
export function trackAPICall(endpoint: string, method: string, responseTime: number, success: boolean) {
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

/**
 * Identify user with properties
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>) {
  PostHog.identify(userId, properties);
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>) {
  PostHog.setPersonProperties(properties);
}

/**
 * Track Core Web Vitals
 */
export function trackWebVitals(metric: string, value: number) {
  trackEvent('web_vital', {
    metric,
    value,
  });
}
