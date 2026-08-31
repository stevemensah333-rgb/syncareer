import React, { useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import GoogleSignInButton from './GoogleSignInButton';
import PasswordField from './PasswordField';
import { getAuthErrorMessage, getReturnToFromLocationState } from './authUtils';
import { ANALYTICS_EVENTS, captureProductEvent } from '@/services/analytics';
import { ACCOUNT_ROLES } from '@/lib/accountRoles';

const ROLE_OPTIONS = [
  { value: ACCOUNT_ROLES[0], label: 'Student / Job seeker' },
  { value: ACCOUNT_ROLES[1], label: 'Career mentor' },
];

export default function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userType, setUserType] = useState<string>('student');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [confirmationEmail, setConfirmationEmail] = useState('');
  const submissionInFlight = useRef(false);
  const returnTo = getReturnToFromLocationState(location.state);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submissionInFlight.current) return;
    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Complete every field before creating your account.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Use a password with at least 8 characters.');
      return;
    }
    submissionInFlight.current = true;
    const analyticsRole = userType === 'career_counsellor' ? 'career_counsellor' : 'student';
    captureProductEvent(ANALYTICS_EVENTS.SIGN_UP_STARTED, { method: 'email', user_role: analyticsRole });
    setSubmitting(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            user_type: userType,
          },
          emailRedirectTo: `${window.location.origin}/sign-in`,
        },
      });
      if (error) throw error;
      captureProductEvent(ANALYTICS_EVENTS.ACCOUNT_CREATED, { method: 'email', user_role: analyticsRole, confirmation_required: !data.session });

      // Fire-and-forget welcome email (don't block signup on failure)
      const newUserId = data.user?.id;
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'welcome',
          recipientEmail: email.trim(),
          idempotencyKey: `welcome-${newUserId ?? email.trim()}`,
          templateData: { name: fullName.trim() },
        },
      }).catch((err) => console.warn('welcome email enqueue failed', err));

      // If email confirmation is required, there's no session yet.
      if (!data.session) {
        setConfirmationEmail(email.trim());
        return;
      }

      // Logged in immediately — onboarding route will pick up user_type from auth metadata.
      navigate(returnTo === '/' ? '/onboarding' : returnTo, { replace: true });
    } catch (error) {
      setErrorMessage(getAuthErrorMessage(error, 'sign-up'));
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div>
      {confirmationEmail ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <h2 className="font-semibold text-foreground">Check your email</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">If the address can be registered, we sent confirmation instructions to <strong className="text-foreground">{confirmationEmail}</strong>.</p>
          </div>
          <p className="text-sm text-muted-foreground">Open the latest message, confirm your email, then return to sign in. Check spam if it does not arrive.</p>
          <Button asChild className="w-full"><Link to="/sign-in">Continue to sign in</Link></Button>
        </div>
      ) : <>
      <div className="mb-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="user-type">I'm joining as</Label>
          <Select value={userType} onValueChange={setUserType}>
            <SelectTrigger id="user-type" className="h-11">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {userType === 'student' ? (
          <GoogleSignInButton label="Sign up with Google" returnTo={returnTo === '/' ? '/onboarding' : returnTo} />
        ) : (
          <p className="rounded-lg border bg-muted/40 p-3 text-sm leading-6 text-muted-foreground">
            Mentor accounts use an organization email. The Syncareer team verifies the email domain before your profile is listed.
          </p>
        )}
        <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" />
          <span>{userType === 'student' ? 'or use email' : 'continue with email'}</span>
          <div className="h-px flex-1 bg-border" />
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input
            id="full-name"
            type="text"
            autoComplete="name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            name="name" className="h-11"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sign-up-email">Email</Label>
          <Input
            id="sign-up-email" name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11"
          />
        </div>
        <PasswordField id="sign-up-password" label="Password" value={password} onChange={setPassword} autoComplete="new-password" minLength={8} description="At least 8 characters." />
        {errorMessage ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-sm text-destructive">{errorMessage}</div> : null}
        <Button
          type="submit"
          disabled={submitting}
          aria-busy={submitting} className="h-11 w-full"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/sign-in" className="font-medium text-primary hover:underline">Sign in</Link>
        </p>
      </form></>}
    </div>
  );
}
