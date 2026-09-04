export const OAUTH_RETURN_TO_KEY = 'syncareer.oauth.returnTo';
export const OAUTH_PENDING_KEY = 'syncareer.oauth.pending';

const PUBLIC_AUTH_PATHS = ['/sign-in', '/sign-up', '/reset-password', '/auth'];

export function getSafeReturnTo(value: unknown, fallback = '/'): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    if (PUBLIC_AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export function getReturnToFromLocationState(state: unknown): string {
  const from = (state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  if (!from?.pathname) return '/';
  return getSafeReturnTo(`${from.pathname}${from.search ?? ''}${from.hash ?? ''}`);
}

/** Auth entry points use a query parameter for public CTAs and location state
 * for protected-route redirects. Protected-route state takes precedence. */
export function getAuthReturnTo(state: unknown, search: string): string {
  const stateReturnTo = getReturnToFromLocationState(state);
  if (stateReturnTo !== '/') return stateReturnTo;
  return getSafeReturnTo(new URLSearchParams(search).get('returnTo'));
}

export function authPath(path: '/sign-in' | '/sign-up' | '/onboarding', returnTo: string): string {
  const safeReturnTo = getSafeReturnTo(returnTo);
  return safeReturnTo === '/' ? path : `${path}?returnTo=${encodeURIComponent(safeReturnTo)}`;
}

export function getAuthErrorMessage(error: unknown, context: 'sign-in' | 'sign-up' | 'reset' | 'oauth'): string {
  const message = error instanceof Error
    ? error.message.toLowerCase()
    : typeof error === 'object' && error && 'message' in error
      ? String(error.message).toLowerCase()
      : '';

  if (context === 'sign-in' && (message.includes('invalid login') || message.includes('invalid credentials'))) {
    return 'Email or password is incorrect. Check your details and try again.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Open the latest confirmation email and try again.';
  }
  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Too many attempts. Wait a few minutes, then try again.';
  }
  if (message.includes('expired') || message.includes('invalid token') || message.includes('session missing')) {
    return 'This link is no longer valid. Request a new link and try again.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('offline')) {
    return 'We could not reach Syncareer. Check your connection and try again.';
  }
  if (context === 'oauth' && (message.includes('cancel') || message.includes('denied') || message.includes('closed'))) {
    return 'Google sign-in was cancelled. You can try again or use email and password.';
  }
  if (context === 'sign-up') {
    return 'We could not create the account. Try signing in, resetting your password, or use a different email.';
  }
  if (context === 'reset') {
    return 'We could not complete that request. Try again or request a new reset link.';
  }
  if (context === 'oauth') {
    return 'Google sign-in could not be completed. Try again or use email and password.';
  }
  return 'Sign in could not be completed. Check your details and try again.';
}
