// Thin analytics facade that keeps the public API synchronous-safe while
// loading the heavy `posthog-js` dependency only after the page is idle.
//
// Before this module, `posthog-js` (~187 kB rendered) was pulled into the
// initial index chunk because of the static `import posthog from 'posthog-js'`
// at module top. Initialization was already delayed via requestIdleCallback in
// main.tsx, but the *code* still had to parse and evaluate before any analytics
// call could be made. Now both code download and evaluation are deferred:
// calls before the module loads are queued and replayed in order.

type PostHog = any;

type TrackArgs =
  | [eventOrName: string, properties?: Record<string, unknown>]
  | [eventOrName: { event: string; properties?: Record<string, unknown> }];

let ph: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;
type QueuedCall =
  | { op: "init"; key: string; userId?: string }
  | { op: "capture"; event: string; properties?: Record<string, unknown> }
  | { op: "set"; properties: Record<string, unknown> }
  | { op: "identify"; userId: string; properties?: Record<string, unknown> }
  | { op: "reset" };
const queue: QueuedCall[] = [];

// Only load PostHog in the browser and only once. SSR/tests/iframes with no
// env var stay on the no-op queue which resolves to `null`.
function canLoad(): boolean {
  if (typeof window === "undefined") return false;
  // Respect Do Not Track for privacy.
  const nav = navigator as Navigator & { doNotTrack?: string };
  if (nav.doNotTrack === "1") return false;
  return true;
}

function getApiKey(): string | undefined {
  // Read from either Vite's import.meta.env or process.env (Node/vitest).
  const fromVite = (import.meta as any)?.env?.VITE_POSTHOG_API_KEY;
  const fromProcess = typeof process !== "undefined" ? (process as any).env?.VITE_POSTHOG_API_KEY : undefined;
  const key = fromVite || fromProcess;
  return typeof key === "string" && key.length > 0 ? key : undefined;
}

async function loadPostHog(): Promise<PostHog | null> {
  if (ph) return ph;
  if (!canLoad()) return null;
  const key = getApiKey();
  if (!key) return null;
  try {
    const mod = await import("posthog-js");
    const posthog = mod.default || mod;
    posthog.init(key, {
      api_host: "https://us.posthog.com",
      loaded: (instance: PostHog) => {
        ph = instance;
      },
    });
    // init() calls `.loaded(...)` synchronously in modern versions, but be safe:
    ph = ph || posthog;
    // Drain queue in order. The `run()` helper silently swallows errors so
    // that a faulty event (e.g. from tests that mock throw) does not blow
    // the queue drain; we still log in dev for visibility.
    let call = queue.shift();
    while (call) {
      run(call);
      call = queue.shift();
    }
    return ph;
  } catch (e) {
    console.error("[Analytics] Failed to load posthog-js:", e);
    return null;
  }
}

function enqueue(call: QueuedCall) {
  if (ph) {
    run(call);
    return;
  }
  queue.push(call);
  if (!initPromise) {
    // Kick off load immediately (on the next microtask) rather than waiting
    // for idle or for initializeAnalytics() to be called. Previously this
    // only started loading when main.tsx ran the idle-time schedule, which
    // could be seconds after first paint; any event fired in the meantime
    // just sat in the queue until then.
    initPromise = loadPostHog();
  }
}

function run(call: QueuedCall) {
  if (!ph) return;
  try {
  switch (call.op) {
    case "capture":
      ph.capture(call.event, call.properties);
      break;
    case "set":
      ph.people?.set?.(call.properties);
      break;
    case "identify":
      ph.identify(call.userId, call.properties);
      break;
    case "reset":
      ph.reset?.();
      break;
    case "init":
      // no-op: initialization happens inside loadPostHog. `userId` can be
      // applied via identify after load.
      if (call.userId) ph.identify(call.userId, { userId: call.userId });
      break;
  }
  } catch (e) {
    console.error("[Analytics] Call failed:", e);
  }
}

/**
 * Event tracking constants — all analytics events in the app.
 * Values are unchanged from the previous module so no downstream dashboards
 * break.
 */
export const EVENTS = {
  SIGN_UP_STARTED: "sign_up_started",
  SIGN_UP_COMPLETED: "sign_up_completed",
  SIGN_IN_COMPLETED: "sign_in_completed",
  SIGN_OUT_COMPLETED: "sign_out_completed",
  PASSWORD_RESET: "password_reset",

  ONBOARDING_STARTED: "onboarding_started",
  ONBOARDING_COMPLETED: "onboarding_completed",
  ONBOARDING_SKIPPED: "onboarding_skipped",

  ASSESSMENT_STARTED: "assessment_started",
  ASSESSMENT_COMPLETED: "assessment_completed",
  ASSESSMENT_ABANDONED: "assessment_abandoned",

  CV_BUILDER_OPENED: "cv_builder_opened",
  CV_SECTION_COMPLETED: "cv_section_completed",
  CV_SAVED: "cv_saved",
  CV_DOWNLOADED: "cv_downloaded",

  INTERVIEW_STARTED: "interview_started",
  INTERVIEW_COMPLETED: "interview_completed",
  INTERVIEW_QUESTION_ANSWERED: "interview_question_answered",

  JOB_VIEW: "job_view",
  JOB_APPLY: "job_apply",
  APPLICATION_STATUS_UPDATE: "application_status_update",

  FEATURE_ACCESSED: "feature_accessed",
  HELP_VIEWED: "help_viewed",
  TOUR_STARTED: "tour_started",
  TOUR_COMPLETED: "tour_completed",
  TOUR_SKIPPED: "tour_skipped",

  SUBSCRIPTION_INITIATED: "subscription_initiated",
  SUBSCRIPTION_COMPLETED: "subscription_completed",
  SUBSCRIPTION_CANCELLED: "subscription_cancelled",

  ERROR_OCCURRED: "error_occurred",
  PAGE_ERROR: "page_error",

  PAGE_LOAD: "page_load",
  API_CALL: "api_call",
  API_ERROR: "api_error",
} as const;

// Event tracking types (kept compatible with previous export).
export type TrackableEvent =
  | { event: "page_view"; properties: { page_name: string; path?: string; [key: string]: unknown } }
  | { event: "user_signup"; properties: { user_type: string; [key: string]: unknown } }
  | { event: "user_signin"; properties: { method: string; [key: string]: unknown } }
  | { event: "feature_opened"; properties: { feature_name: string; feature_id?: string; [key: string]: unknown } }
  | { event: "assessment_started"; properties: { assessment_type: string; [key: string]: unknown } }
  | { event: "assessment_completed"; properties: { assessment_type: string; score?: number; duration_seconds?: number; [key: string]: unknown } }
  | { event: "cv_section_added"; properties: { section_type: string; order?: number; [key: string]: unknown } }
  | { event: "cv_section_completed"; properties: { section_type: string; [key: string]: unknown } }
  | { event: "tour_started"; properties: { tour_type: string; [key: string]: unknown } }
  | { event: "tour_completed"; properties: { tour_type: string; steps_completed: number; [key: string]: unknown } }
  | { event: "tour_skipped"; properties: { tour_type: string; step_current?: number; [key: string]: unknown } }
  | { event: "help_tooltip_clicked"; properties: { tooltip_id: string; feature_name: string; [key: string]: unknown } }
  | { event: "notification_viewed"; properties: { notification_type: string; [key: string]: unknown } }
  | { event: "notification_clicked"; properties: { notification_type: string; action: string; [key: string]: unknown } }
  | { event: "referral_copied"; properties: Record<string, unknown> }
  | { event: "referral_clicked"; properties: { source: string; [key: string]: unknown } }
  | { event: "profile_progress_updated"; properties: { completion_percent: number; section?: string; [key: string]: unknown } }
  | { event: "form_submitted"; properties: { form_name: string; fields_completed: number; [key: string]: unknown } }
  | { event: "form_error"; properties: { form_name: string; error_type: string; [key: string]: unknown } }
  | { event: "api_error"; properties: { endpoint: string; status_code: number; error_message: string; [key: string]: unknown } }
  | { event: "feature_error"; properties: { feature_name: string; error_message: string; [key: string]: unknown } }
  | { event: "user_action"; properties: { action_name: string; context?: string; [key: string]: unknown } }
  | { event: string; properties?: Record<string, unknown> };

export const initializeAnalytics = (userId?: string): void => {
  try {
    // Force a load regardless of whether any events have been queued yet.
    // This is the hook main.tsx uses during idle to warm up analytics for
    // passive page-view tracking.
    if (!ph && !initPromise && canLoad() && getApiKey()) {
      initPromise = loadPostHog();
    }
    enqueue({ op: "init", key: getApiKey() || "", userId });
  } catch (error) {
    console.error("[Analytics] Error initializing analytics:", error);
  }
};

export function trackEvent(...args: TrackArgs): void {
  try {
    const eventOrName = args[0];
    const properties = args[1] as Record<string, unknown> | undefined;
    if (typeof eventOrName === "string") {
      enqueue({ op: "capture", event: eventOrName, properties });
    } else {
      enqueue({ op: "capture", event: eventOrName.event, properties: eventOrName.properties });
    }
  } catch (error) {
    console.error("[Analytics] Error tracking event:", error);
  }
}

export const setUserProperties = (properties: Record<string, unknown>): void => {
  try {
    enqueue({ op: "set", properties });
  } catch (error) {
    console.error("[Analytics] Error setting user properties:", error);
  }
};

export const identifyUser = (userId: string, properties?: Record<string, unknown>): void => {
  try {
    enqueue({ op: "identify", userId, properties });
  } catch (error) {
    console.error("[Analytics] Error identifying user:", error);
  }
};

export const resetAnalytics = (): void => {
  try {
    enqueue({ op: "reset" });
  } catch (error) {
    console.error("[Analytics] Error resetting analytics:", error);
  }
};

export const trackPageView = (
  pageName: string,
  pathOrProperties?: string | Record<string, unknown>,
  properties?: Record<string, unknown>,
): void => {
  const path = typeof pathOrProperties === "string" ? pathOrProperties : (properties?.path as string) || "";
  const extraProps = typeof pathOrProperties === "object" ? pathOrProperties : properties || {};
  trackEvent({
    event: "page_view",
    properties: { page_name: pageName, path, ...extraProps },
  });
};

// Convenience helpers.
export function trackSignUp(method: "email" | "google" | "github"): void {
  trackEvent(EVENTS.SIGN_UP_STARTED, { method });
}
export function trackSignUpCompleted(userType: string): void {
  trackEvent(EVENTS.SIGN_UP_COMPLETED, { user_type: userType });
}
export function trackSignIn(method: "email" | "google" | "github"): void {
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
  trackEvent(EVENTS.ERROR_OCCURRED, { error_message: errorMessage, error_code: errorCode });
}
export function trackAPICall(endpoint: string, method: string, responseTime: number, success: boolean): void {
  if (success) {
    trackEvent(EVENTS.API_CALL, { endpoint, method, response_time_ms: responseTime });
  } else {
    trackEvent(EVENTS.API_ERROR, { endpoint, method, response_time_ms: responseTime });
  }
}
export function trackWebVitals(metric: string, value: number): void {
  trackEvent("web_vital", { metric, value });
}

// Test helper: reset the loaded state so tests don't see a shared instance.
export function __resetForTests(): void {
  ph = null;
  initPromise = null;
  queue.length = 0;
}
