import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  initializeAnalytics,
  trackEvent,
  trackPageView,
  identifyUser,
  setUserProperties,
  resetAnalytics,
  EVENTS,
  __resetForTests,
} from './analytics';

// Use a factory mock so tests control the resolved module.
const posthogMock = {
  init: vi.fn((_key: string, opts: any) => {
    // Mimic posthog-js: invoke loaded() synchronously.
    opts?.loaded?.(posthogMock);
    return posthogMock;
  }),
  capture: vi.fn(),
  identify: vi.fn(),
  reset: vi.fn(),
  people: { set: vi.fn() },
};

vi.mock('posthog-js', () => ({
  default: posthogMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('VITE_POSTHOG_API_KEY', 'test-api-key');
  // jsdom provides window/navigator; make sure Do Not Track is off.
  Object.defineProperty(navigator, 'doNotTrack', { configurable: true, value: null });
  __resetForTests();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetForTests();
});

describe('analytics service (PostHog Boundary)', () => {
  it('initializes PostHog and replays queued events after load', async () => {
    trackEvent('warmup_event', { before: true });
    initializeAnalytics('user-123');

    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    expect(posthogMock.init).toHaveBeenCalledWith(
      'test-api-key',
      expect.objectContaining({ api_host: 'https://us.posthog.com' }),
    );
    expect(posthogMock.capture).toHaveBeenCalledWith('warmup_event', { before: true });
    expect(posthogMock.identify).toHaveBeenCalledWith('user-123', { userId: 'user-123' });
  });

  it('tracks events with object payloads and string event names after load', async () => {
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    trackEvent({ event: 'user_signup', properties: { user_type: 'student' } });
    expect(posthogMock.capture).toHaveBeenCalledWith('user_signup', { user_type: 'student' });

    trackEvent(EVENTS.SIGN_IN_COMPLETED, { method: 'email' });
    expect(posthogMock.capture).toHaveBeenCalledWith('sign_in_completed', { method: 'email' });
  });

  it('tracks page views accurately after load', async () => {
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    trackPageView('Dashboard', '/dashboard');
    expect(posthogMock.capture).toHaveBeenCalledWith('page_view', {
      page_name: 'Dashboard',
      path: '/dashboard',
    });
  });

  it('identifies users, sets user properties, and resets analytics after load', async () => {
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    identifyUser('user-123', { role: 'student' });
    expect(posthogMock.identify).toHaveBeenCalledWith('user-123', { role: 'student' });

    setUserProperties({ premium: true });
    expect(posthogMock.people.set).toHaveBeenCalledWith({ premium: true });

    resetAnalytics();
    expect(posthogMock.reset).toHaveBeenCalled();
  });

  it('does not throw when posthog throws an error after load', async () => {
    initializeAnalytics();
    await vi.waitFor(() => expect(posthogMock.init).toHaveBeenCalled());

    vi.mocked(posthogMock.capture).mockImplementationOnce(() => {
      throw new Error('PostHog capture failure');
    });

    expect(() => {
      trackEvent('failing_event', {});
    }).not.toThrow();
  });

  it('no-ops gracefully when VITE_POSTHOG_API_KEY is missing', async () => {
    vi.unstubAllEnvs();
    __resetForTests();
    // No env var set → should never attempt to load posthog-js.
    trackEvent('should-not-be-sent');
    initializeAnalytics();
    await new Promise((r) => setTimeout(r, 50));
    expect(posthogMock.init).not.toHaveBeenCalled();
    expect(posthogMock.capture).not.toHaveBeenCalled();
  });
});
