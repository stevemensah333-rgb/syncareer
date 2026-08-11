import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import PasswordField from './PasswordField';
import { getAuthErrorMessage } from './authUtils';

export default function ResetPasswordForm() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkIsValid, setLinkIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setLinkIsValid(Boolean(data.session));
      setCheckingLink(false);
    }).catch(() => {
      if (!active) return;
      setLinkIsValid(false);
      setCheckingLink(false);
    });
    return () => { active = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setErrorMessage('The passwords do not match.');
      return;
    }
    submissionInFlight.current = true;
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'reset'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div>
      {checkingLink ? (
        <div role="status" aria-live="polite" className="py-6 text-center text-sm text-muted-foreground">Checking your reset link…</div>
      ) : !linkIsValid ? (
        <div className="space-y-4" role="alert">
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4">
            <h2 className="font-semibold">This reset link is invalid or expired</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Reset links can only be used once and expire for your security.</p>
          </div>
          <Button className="w-full" onClick={() => navigate('/sign-in/forgot-password')}>Request a new link</Button>
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-5">
        <PasswordField id="new-password" label="New password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} description="At least 8 characters." />
        <PasswordField id="confirm-password" label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" minLength={8} />
        {errorMessage ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errorMessage}</div> : null}
        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting} className="h-11 w-full"
        >
          {submitting ? 'Saving…' : 'Update password'}
        </Button>
      </form>)}
    </div>
  );
}
