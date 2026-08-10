import { describe, it, expect, vi, beforeEach } from 'vitest';
import posthog from 'posthog-js';
import {
  initializeAnalytics,
  trackEvent,
  trackPageView,
  identifyUser,
  setUserProperties,
  resetAnalytics,
  EVENTS,
} from './analytics';

vi.mock('posthog-js', () => ({
  default: {
    init: vi.fn(),
    capture: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
    people: {
      set: vi.fn(),
    },
  },
}));

describe('analytics service (PostHog Boundary)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes PostHog when VITE_POSTHOG_API_KEY is defined', () => {
    vi.stubEnv('VITE_POSTHOG_API_KEY', 'test-api-key');
    initializeAnalytics('user-123');
    expect(posthog.init).toHaveBeenCalledWith(
      'test-api-key',
      expect.objectContaining({
        api_host: 'https://us.posthog.com',
      })
    );
  });

  it('tracks events with object payloads and string event names', () => {
    trackEvent({ event: 'user_signup', properties: { user_type: 'student' } });
    expect(posthog.capture).toHaveBeenCalledWith('user_signup', { user_type: 'student' });

    trackEvent(EVENTS.SIGN_IN_COMPLETED, { method: 'email' });
    expect(posthog.capture).toHaveBeenCalledWith('sign_in_completed', { method: 'email' });
  });

  it('tracks page views accurately', () => {
    trackPageView('Dashboard', '/dashboard');
    expect(posthog.capture).toHaveBeenCalledWith('page_view', {
      page_name: 'Dashboard',
      path: '/dashboard',
    });
  });

  it('identifies users, sets user properties, and resets analytics', () => {
    identifyUser('user-123', { role: 'student' });
    expect(posthog.identify).toHaveBeenCalledWith('user-123', { role: 'student' });

    setUserProperties({ premium: true });
    expect(posthog.people.set).toHaveBeenCalledWith({ premium: true });

    resetAnalytics();
    expect(posthog.reset).toHaveBeenCalled();
  });

  it('does not throw when posthog throws an error', () => {
    vi.mocked(posthog.capture).mockImplementationOnce(() => {
      throw new Error('PostHog capture failure');
    });

    expect(() => {
      trackEvent('failing_event', {});
    }).not.toThrow();
  });
});
