import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth';
import { getSafeReturnTo, OAUTH_PENDING_KEY, OAUTH_RETURN_TO_KEY } from './authUtils';

const CALLBACK_TIMEOUT_MS = 10_000;

export function hasOAuthReturnState(): boolean {
  const params = new URLSearchParams(window.location.search);
  return sessionStorage.getItem(OAUTH_PENDING_KEY) === 'true'
    || params.has('error')
    || params.has('error_description');
}

export default function OAuthReturnState() {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();
  const params = new URLSearchParams(window.location.search);
  const providerReturnedError = params.has('error') || params.has('error_description');
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (providerReturnedError) {
      sessionStorage.removeItem(OAUTH_PENDING_KEY);
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }
    const timeout = window.setTimeout(() => setTimedOut(true), CALLBACK_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [providerReturnedError]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const returnTo = getSafeReturnTo(sessionStorage.getItem(OAUTH_RETURN_TO_KEY));
    sessionStorage.removeItem(OAUTH_PENDING_KEY);
    sessionStorage.removeItem(OAUTH_RETURN_TO_KEY);
    navigate(returnTo, { replace: true });
  }, [isLoaded, isSignedIn, navigate]);

  const failed = providerReturnedError || timedOut;
  return (
    <main className="app-canvas grid min-h-screen place-items-center px-4 py-8">
      <section className="w-full max-w-md rounded-xl border bg-card p-6 text-center" aria-live="polite">
        <div aria-hidden="true" className={`mx-auto mb-4 h-9 w-9 rounded-full border-2 border-primary/25 border-t-primary ${failed ? '' : 'animate-spin'}`} />
        <h1 className="text-xl font-semibold">{failed ? 'Google sign-in was not completed' : 'Completing Google sign-in'}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {failed
            ? 'The request was cancelled, expired, or could not be verified. No account changes were made.'
            : 'Securely confirming your session and returning you to Syncareer…'}
        </p>
        {failed ? (
          <div className="mt-5 space-y-3">
            <Button asChild className="w-full"><Link to="/sign-in">Try Google sign-in again</Link></Button>
            <Button asChild variant="outline" className="w-full"><Link to="/sign-in">Use email and password</Link></Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}
