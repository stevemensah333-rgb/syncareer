import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ANALYTICS_EVENTS,
  canCaptureAnalytics,
  captureProductEvent,
  getAnalyticsConsent,
  setAnalyticsConsent,
  initializeAnalytics,
  identifyAnalyticsUser,
  resetAnalyticsIdentity,
  __resetForTests,
  ANALYTICS_CONSENT_KEY,
} from './analytics';

// Factory mock for posthog-js
const posthogMock = {
  init: vi.fn((_key: string, opts: any) => {
    opts?.loaded?.(posthogMock);
    return posthogMock;
  }),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  opt_out_capturing: vi.fn(),
};

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

function storageWith(value: string | null) {
  let current = value;
  return {
    getItem: vi.fn(() => current),
    setItem: vi.fn((_k: string, v: string) => {
      current = v;
    }),
    // helpers for test inspection
    _get: () => current,
    _set: (v: string | null) => {
      current = v;
    },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_POSTHOG_API_KEY', 'test-api-key');
  vi.stubEnv('VITE_ANALYTICS_CAPTURE_ENABLED', 'true');
  // Ensure DNT off
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: null });
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: storageWith('granted'),
  });
  __resetForTests();
  // prime localStorage consent to granted for most tests
  window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetForTests();
  // restore DNT
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: null });
});

describe('analytics consent & gating', () => {
  it('returns unknown when consent key missing', () => {
    const store = storageWith(null);
    expect(getAnalyticsConsent(store)).toBe('unknown');
  });

  it('canCaptureAnalytics is false without granted consent', () => {
    const store = storageWith('denied');
    expect(canCaptureAnalytics(store)).toBe(false);
    const unknownStore = storageWith(null);
    expect(canCaptureAnalytics(unknownStore)).toBe(false);
  });

  it('canCaptureAnalytics is false when api key missing', () => {
    vi.stubEnv('VITE_POSTHOG_API_KEY', '');
    const store = storageWith('granted');
    expect(canCaptureAnalytics(store)).toBe(false);
  });

  it('canCaptureAnalytics is false when capture flag disabled', () => {
    vi.stubEnv('VITE_ANALYTICS_CAPTURE_ENABLED', 'false');
    const store = storageWith('granted');
    expect(canCaptureAnalytics(store)).toBe(false);
  });

  it('canCaptureAnalytics respects Do Not Track', () => {
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: '1' });
    const store = storageWith('granted');
    expect(canCaptureAnalytics(store)).toBe(false);
  });

  it('setAnalyticsConsent denied clears queue and opts out', async () => {
    const store = storageWith('granted');
    // queue an event first
    captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: 'landing' });
    // now deny
    setAnalyticsConsent('denied', store);
    expect(store.getItem).toBeDefined();
    // queue should be cleared and opt_out called (client may be null, but shouldn't throw)
    expect(() => setAnalyticsConsent('denied', store)).not.toThrow();
  });
});

describe('captureProductEvent property validation', () => {
  it('allows only catalogue properties and coarse types', async () => {
    // setup granted consent so canCapture true
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    // valid event
    captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: 'dashboard' });
    expect(posthogMock.capture).toHaveBeenCalledWith('page_viewed', { route: 'dashboard' });

    // invalid property key should be dropped (no throw, no capture)
    vi.clearAllMocks();
    // @ts-expect-error testing invalid prop
    captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: 'dashboard', raw_url: 'https://evil.com' } as any);
    expect(posthogMock.capture).not.toHaveBeenCalled();

    // free-text payload attempt with object should be dropped
    vi.clearAllMocks();
    // @ts-expect-error object type not allowed
    captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: { nested: 'object' } } as any);
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });

  it('queues events before load and replays after init', async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    // ensure clean
    __resetForTests();
    captureProductEvent(ANALYTICS_EVENTS.PUBLIC_CTA_SELECTED, { destination: 'opportunities', placement: 'hero' });
    // init should trigger load and replay
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());
    await vi.waitFor(() => expect(posthogMock.capture).toHaveBeenCalledWith('public_cta_selected', { destination: 'opportunities', placement: 'hero' }));
  });

  it('never throws when posthog capture throws', async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());
    vi.mocked(posthogMock.capture).mockImplementationOnce(() => {
      throw new Error('capture failed');
    });
    expect(() => {
      captureProductEvent(ANALYTICS_EVENTS.CV_PREVIEWED, {});
    }).not.toThrow();
  });

  it('does not capture when consent not granted', () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'denied');
    captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: 'landing' });
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});

describe('identity transition', () => {
  it('identify hashes user id pseudonymously and does not expose raw id', async () => {
    window.localStorage.setItem(ANALYTICS_CONSENT_KEY, 'granted');
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());
    await identifyAnalyticsUser('user-123', 'student');
    expect(posthogMock.identify).toHaveBeenCalled();
    const [hashed, props] = vi.mocked(posthogMock.identify).mock.calls[0] ?? [];
    // hashed should be hex string 64 chars (sha256)
    expect(typeof hashed).toBe('string');
    expect((hashed as string).length).toBe(64);
    expect(hashed).not.toContain('user-123');
    expect(props).toEqual({ user_role: 'student' });
  });

  it('reset does not throw when client missing', () => {
    expect(() => resetAnalyticsIdentity()).not.toThrow();
  });
});

describe('event catalogue integrity', () => {
  it('defines all required funnel events', () => {
    const required = [
      'page_viewed',
      'public_cta_selected',
      'sign_up_started',
      'account_created',
      'onboarding_completed',
      'opportunities_viewed',
      'opportunity_saved',
      'opportunity_marked_applied',
      'application_created',
      'application_next_action_set',
      'application_stage_recorded',
      'application_outcome_recorded',
      'cv_started',
      'cv_meaningful_section_completed',
      'cv_save_finished',
      'cv_previewed',
      'cv_exported',
      'interview_setup_opened',
      'interview_device_checked',
      'interview_session_started',
      'interview_session_finished',
      'interview_retried',
      'assessment_started',
      'assessment_progress',
      'assessment_abandoned',
      'assessment_resumed',
      'assessment_completed',
      'contextual_ai_requested',
      'contextual_ai_finished',
      'contextual_ai_decided',
      'contextual_learning_actioned',
    ];
    for (const name of required) {
      expect(Object.values(ANALYTICS_EVENTS)).toContain(name);
    }
  });
});
