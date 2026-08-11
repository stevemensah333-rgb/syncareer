import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import type { AnalyticsEventProperties } from '@/services/analyticsEvents';

export function routeCategory(pathname: string): AnalyticsEventProperties['page_viewed']['route'] {
  if (pathname === '/') return 'landing';
  if (/^\/(sign-in|sign-up|reset-password|signed-out)/.test(pathname)) return 'auth';
  if (pathname.startsWith('/onboarding')) return 'onboarding';
  if (pathname.startsWith('/dashboard')) return 'dashboard';
  if (pathname.startsWith('/opportunities')) return 'opportunities';
  if (pathname.startsWith('/applications')) return 'applications';
  if (pathname.startsWith('/cv-builder')) return 'cv_builder';
  if (pathname.startsWith('/interview-simulator')) return 'interview';
  if (pathname.startsWith('/assessment')) return 'assessment';
  if (pathname.startsWith('/pricing')) return 'pricing';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'other';
}

/** Mounted once below BrowserRouter. Query strings and identifiers are never captured. */
export function usePageTracking() {
  const { pathname } = useLocation();
  useEffect(() => captureProductEvent(ANALYTICS_EVENTS.PAGE_VIEWED, { route: routeCategory(pathname) }), [pathname]);
}
