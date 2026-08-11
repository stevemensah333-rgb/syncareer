import type { PostHog } from 'posthog-js';
import { ANALYTICS_PROPERTY_KEYS, type AnalyticsEventName, type AnalyticsEventProperties } from './analyticsEvents';

export { ANALYTICS_EVENTS } from './analyticsEvents';

export type AnalyticsConsent = 'unknown' | 'granted' | 'denied';
export const ANALYTICS_CONSENT_KEY = 'syncareer.analytics_consent';

let client: PostHog | null = null;
let loadPromise: Promise<PostHog | null> | null = null;
const queue: Array<{ event: AnalyticsEventName; properties: Record<string, unknown> }> = [];

function captureEnabled(): boolean {
  return import.meta.env.VITE_ANALYTICS_CAPTURE_ENABLED === 'true';
}

function apiKeyConfigured(): boolean {
  return Boolean(import.meta.env.VITE_POSTHOG_API_KEY?.trim());
}

export function getAnalyticsConsent(storage: Pick<Storage, 'getItem'> = localStorage): AnalyticsConsent {
  try {
    const value = storage.getItem(ANALYTICS_CONSENT_KEY);
    return value === 'granted' || value === 'denied' ? value : 'unknown';
  } catch {
    return 'unknown';
  }
}

export function canCaptureAnalytics(storage?: Pick<Storage, 'getItem'>): boolean {
  if (typeof window === 'undefined' || !captureEnabled() || !apiKeyConfigured()) return false;
  if (navigator.doNotTrack === '1') return false;
  return getAnalyticsConsent(storage) === 'granted';
}

export function setAnalyticsConsent(consent: Exclude<AnalyticsConsent, 'unknown'>, storage: Pick<Storage, 'setItem'> = localStorage): void {
  try { storage.setItem(ANALYTICS_CONSENT_KEY, consent); } catch { return; }
  if (consent === 'denied') {
    queue.length = 0;
    try { client?.opt_out_capturing(); client?.reset(); } catch { /* Product behavior must not depend on analytics. */ }
  } else {
    void loadPostHog();
  }
}

async function loadPostHog(): Promise<PostHog | null> {
  if (client) return client;
  if (!canCaptureAnalytics()) return null;
  try {
    const module = await import('posthog-js');
    const posthog = module.default;
    posthog.init(import.meta.env.VITE_POSTHOG_API_KEY, {
      api_host: 'https://us.posthog.com',
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      disable_session_recording: true,
      persistence: 'localStorage+cookie',
      loaded: (instance) => { client = instance; },
    });
    client = client ?? posthog;
    for (const call of queue.splice(0)) safeCapture(call.event, call.properties);
    return client;
  } catch {
    if (import.meta.env.DEV) console.warn('[Analytics] Provider unavailable.');
    return null;
  }
}

function safeCapture(event: AnalyticsEventName, properties: Record<string, unknown>): void {
  try { client?.capture(event, properties); } catch {
    if (import.meta.env.DEV) console.warn('[Analytics] Capture failed.');
  }
}

function hasOnlyCatalogueProperties(event: AnalyticsEventName, properties: Record<string, unknown>): boolean {
  const allowed = new Set<string>(ANALYTICS_PROPERTY_KEYS[event] as readonly string[]);
  return Object.keys(properties).every((key) => allowed.has(key)) && Object.values(properties).every((value) => value === undefined || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean');
}

export function captureProductEvent<K extends AnalyticsEventName>(event: K, properties: AnalyticsEventProperties[K]): void {
  const record = properties as Record<string, unknown>;
  if (!hasOnlyCatalogueProperties(event, record) || !canCaptureAnalytics()) return;
  if (client) safeCapture(event, record);
  else {
    queue.push({ event, properties: record });
    if (!loadPromise) loadPromise = loadPostHog();
  }
}

export function initializeAnalytics(): void {
  if (!loadPromise && canCaptureAnalytics()) loadPromise = loadPostHog();
}

async function pseudonymousId(rawUserId: string): Promise<string | null> {
  if (!crypto.subtle) return null;
  const bytes = new TextEncoder().encode(`syncareer-analytics-v1:${rawUserId}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function identifyAnalyticsUser(userId: string, role: 'student' | 'career_counsellor' | 'unknown'): Promise<void> {
  if (!canCaptureAnalytics()) return;
  const loaded = client ?? await loadPostHog();
  const id = await pseudonymousId(userId);
  if (!loaded || !id) return;
  try { loaded.identify(id, { user_role: role }); } catch {
    if (import.meta.env.DEV) console.warn('[Analytics] Identity transition failed.');
  }
}

export function resetAnalyticsIdentity(): void {
  if (!canCaptureAnalytics()) return;
  try { client?.reset(); } catch {
    if (import.meta.env.DEV) console.warn('[Analytics] Identity reset failed.');
  }
}

export function __resetForTests(): void {
  client = null;
  loadPromise = null;
  queue.length = 0;
}
