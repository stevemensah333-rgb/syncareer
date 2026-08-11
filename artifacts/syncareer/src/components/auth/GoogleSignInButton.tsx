import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { lovable } from '@/integrations/lovable';
import { getAuthErrorMessage, getSafeReturnTo, OAUTH_PENDING_KEY, OAUTH_RETURN_TO_KEY } from './authUtils';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';

interface Props {
  label?: string;
  className?: string;
  returnTo?: string;
}

export default function GoogleSignInButton({ label = 'Continue with Google', className, returnTo = '/' }: Props) {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const requestInFlight = useRef(false);

  const handleClick = async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    if (/sign up/i.test(label)) captureProductEvent(ANALYTICS_EVENTS.SIGN_UP_STARTED, { method: 'google', user_role: 'unknown' });
    setLoading(true);
    setErrorMessage('');
    sessionStorage.setItem(OAUTH_RETURN_TO_KEY, getSafeReturnTo(returnTo));
    sessionStorage.setItem(OAUTH_PENDING_KEY, 'true');
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.redirected) return; // browser is navigating away
      if (result.error) {
        sessionStorage.removeItem(OAUTH_PENDING_KEY);
        setErrorMessage(getAuthErrorMessage(result.error, 'oauth'));
        requestInFlight.current = false;
        setLoading(false);
        return;
      }
      // Session set — let auth listener take it from here.
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
      window.location.assign(getSafeReturnTo(returnTo));
    } catch (error) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      setErrorMessage(getAuthErrorMessage(error, 'oauth'));
      requestInFlight.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" onClick={handleClick} disabled={loading} aria-busy={loading} className={`h-11 w-full bg-card ${className ?? ''}`}>
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47c-.28 1.4-1.07 2.59-2.27 3.39v2.84h3.67c2.15-1.99 3.39-4.92 3.39-8.47z"/>
        <path fill="#34A853" d="M12 24c3.06 0 5.63-1.02 7.5-2.76l-3.67-2.84c-1.02.69-2.32 1.1-3.83 1.1-2.95 0-5.45-1.99-6.34-4.66H1.86v2.93C3.72 21.43 7.59 24 12 24z"/>
        <path fill="#FBBC05" d="M5.66 14.84c-.23-.69-.36-1.42-.36-2.18s.13-1.49.36-2.18V7.55H1.86C1.08 9.11.64 10.86.64 12.66s.44 3.55 1.22 5.11l3.8-2.93z"/>
        <path fill="#EA4335" d="M12 4.74c1.66 0 3.15.57 4.32 1.69l3.24-3.24C17.62 1.27 15.05.27 12 .27 7.59.27 3.72 2.84 1.86 6.55l3.8 2.93C6.55 6.81 9.05 4.74 12 4.74z"/>
      </svg>
        {loading ? `${label} — opening Google…` : label}
      </Button>
      {errorMessage ? <div role="alert" className="text-sm text-destructive">{errorMessage}</div> : null}
    </div>
  );
}
