import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordField from './PasswordField';
import { getAuthErrorMessage, getReturnToFromLocationState } from './authUtils';

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submissionInFlight = useRef(false);

  const returnTo = getReturnToFromLocationState(location.state);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (!email.trim() || !password) {
      setErrorMessage('Enter your email and password.');
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      navigate(returnTo, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'sign-in'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="space-y-4 mb-5">
        <GoogleSignInButton returnTo={returnTo} />
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>or</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="sign-in-email">Email</Label>
          <Input
            id="sign-in-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-baseline justify-between">
            <span />
            <Link to="/sign-in/forgot-password" className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm">Forgot password?</Link>
          </div>
          <PasswordField id="sign-in-password" label="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        {errorMessage ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errorMessage}</div> : null}
        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting}
          className="h-11 w-full"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          New to Syncareer?{' '}
          <Link to="/sign-up" className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </form>
    </div>
  );
}
