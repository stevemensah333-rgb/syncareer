import posthog from 'posthog-js';

// Initialize PostHog
export const initializeAnalytics = (userId?: string) => {
  const posthogApiKey = import.meta.env.VITE_POSTHOG_API_KEY;
  
  if (posthogApiKey) {
    posthog.init(posthogApiKey, {
      api_host: 'https://us.posthog.com',
      loaded: (ph) => {
        if (userId) {
          ph.identify(userId, {
            userId,
          });
        }
      },
    });
  }
};

// Event tracking types
export type TrackableEvent = 
  | { event: 'page_view'; properties: { page_name: string; path: string } }
  | { event: 'user_signup'; properties: { user_type: string } }
  | { event: 'user_signin'; properties: { method: string } }
  | { event: 'feature_opened'; properties: { feature_name: string; feature_id?: string } }
  | { event: 'assessment_started'; properties: { assessment_type: string } }
  | { event: 'assessment_completed'; properties: { assessment_type: string; score?: number; duration_seconds?: number } }
  | { event: 'cv_section_added'; properties: { section_type: string; order?: number } }
  | { event: 'cv_section_completed'; properties: { section_type: string } }
  
  | { event: 'tour_started'; properties: { tour_type: string } }
  | { event: 'tour_completed'; properties: { tour_type: string; steps_completed: number } }
  | { event: 'tour_skipped'; properties: { tour_type: string; step_current?: number } }
  | { event: 'help_tooltip_clicked'; properties: { tooltip_id: string; feature_name: string } }
  | { event: 'notification_viewed'; properties: { notification_type: string } }
  | { event: 'notification_clicked'; properties: { notification_type: string; action: string } }
  | { event: 'referral_copied'; properties: {} }
  | { event: 'referral_clicked'; properties: { source: string } }
  | { event: 'profile_progress_updated'; properties: { completion_percent: number; section?: string } }
  | { event: 'form_submitted'; properties: { form_name: string; fields_completed: number } }
  | { event: 'form_error'; properties: { form_name: string; error_type: string } }
  | { event: 'api_error'; properties: { endpoint: string; status_code: number; error_message: string } }
  | { event: 'feature_error'; properties: { feature_name: string; error_message: string } }
  | { event: 'user_action'; properties: { action_name: string; context?: string } };

/**
 * Track an analytics event
 */
export const trackEvent = (eventData: TrackableEvent) => {
  try {
    posthog.capture(eventData.event, eventData.properties);
  } catch (error) {
    console.error('[Analytics] Error tracking event:', error);
  }
};

/**
 * Set user properties for analytics
 */
export const setUserProperties = (properties: Record<string, any>) => {
  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Error setting user properties:', error);
  }
};

/**
 * Identify a user
 */
export const identifyUser = (userId: string, properties?: Record<string, any>) => {
  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('[Analytics] Error identifying user:', error);
  }
};

/**
 * Reset analytics (for logout)
 */
export const resetAnalytics = () => {
  try {
    posthog.reset();
  } catch (error) {
    console.error('[Analytics] Error resetting analytics:', error);
  }
};

/**
 * Track page view
 */
export const trackPageView = (pageName: string, path: string) => {
  trackEvent({
    event: 'page_view',
    properties: { page_name: pageName, path },
  });
};
