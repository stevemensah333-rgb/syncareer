import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAuthErrorMessage } from './authUtils';

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submissionInFlight = useRef(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (!email.trim()) {
      setErrorMessage('Enter your email address.');
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'reset'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div>
      {sent ? (
        <div className="space-y-4 text-center">
          <p className="text-sm text-foreground/70">
            If an account matches <strong>{email}</strong>, reset instructions are on their way.
          </p>
          <Link to="/sign-in" className="text-primary hover:text-primary/80 text-sm font-medium">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email</Label>
            <Input
              id="reset-email" name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>
          {errorMessage ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errorMessage}</div> : null}
          <Button
            type="submit"
            disabled={submitting}
            aria-busy={submitting} className="h-11 w-full"
          >
            {submitting ? 'Sending…' : 'Send reset link'}
          </Button>
          <p className="text-center text-sm text-foreground/60">
            <Link to="/sign-in" className="text-primary hover:text-primary/80">Back to sign in</Link>
          </p>
        </form>
      )}
    </div>
  );
}
