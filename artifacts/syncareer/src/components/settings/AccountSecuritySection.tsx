import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { useAuth } from '@/lib/auth';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { accountRoleLabel } from '@/lib/accountRoles';
import { supabase } from '@/integrations/supabase/client';
import { SUPPORT_EMAIL } from '@/lib/contact';
import { SettingField, SettingsEditor, SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';

const PASSWORD_MIN_LENGTH = 8;

/**
 * Account & Security: the parts of an account a person must be able to control
 * — sign-in address, credential, sessions on other machines, and closure.
 *
 * There is deliberately no active-session list: Supabase exposes no per-session
 * read API to the browser, so a list here would be decoration. "Sign out other
 * sessions" uses the `others` sign-out scope, which the auth client and server
 * both support, and leaves this device signed in.
 */
export function AccountSecuritySection() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const [editingEmail, setEditingEmail] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [pending, setPending] = useState<'email' | 'password' | 'devices' | null>(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  const changeEmail = async () => {
    const candidate = newEmail.trim().toLowerCase();
    if (!candidate.includes('@') || candidate.startsWith('@') || candidate.endsWith('@')) {
      setEmailError('Enter a complete email address.');
      return;
    }
    setPending('email');
    const { data, error } = await supabase.auth.updateUser({ email: candidate });
    setPending(null);
    if (error) {
      setEmailError(error.message || 'Your email could not be changed.');
      return;
    }
    setEditingEmail(false);
    setNewEmail('');
    setEmailError(null);
    // The address only moves once the new inbox confirms it; when confirmation
    // is not required the update is already applied.
    toast.success(
      data.user?.email?.toLowerCase() === candidate
        ? 'Email updated'
        : `Confirm the change from ${candidate}. Your address updates after you open the link.`,
    );
  };

  const changePassword = async () => {
    if (password.length < PASSWORD_MIN_LENGTH) {
      setPasswordError(`Use at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setPasswordError('The two passwords do not match.');
      return;
    }
    setPending('password');
    const { error } = await supabase.auth.updateUser({ password });
    setPending(null);
    if (error) {
      setPasswordError(error.message || 'Your password could not be updated.');
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setPasswordError(null);
    setEditingPassword(false);
    toast.success('Password updated');
  };

  const signOutOtherSessions = async () => {
    setPending('devices');
    const { error } = await supabase.auth.signOut({ scope: 'others' });
    setPending(null);
    if (error) {
      toast.error(error.message || 'Other sessions could not be signed out.');
      return;
    }
    toast.success('Signed out on your other devices');
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-account');
      if (response.error) throw new Error(response.error.message || 'Account deletion failed');
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      setDeleting(false);
      setConfirmText('');
      toast.error(error instanceof Error ? error.message : 'Account deletion failed. Try again.');
    }
  };

  const accountCreated = user?.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="space-y-4">
      <SettingsGroup title="Account" description="The identity Syncareer keys your account on.">
        <SettingsRow
          label="Email"
          hint="You sign in with this address. Changing it re-sends a confirmation link."
        >
          <SettingsValue>{user?.email ?? 'Unavailable'}</SettingsValue>
          {!editingEmail && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewEmail(user?.email ?? '');
                setEmailError(null);
                setEditingEmail(true);
              }}
            >
              Change
            </Button>
          )}
        </SettingsRow>

        {editingEmail && (
          <SettingsEditor>
            <div className="mx-auto max-w-md space-y-3">
              <SettingField
                id="account-new-email"
                label="New email address"
                hint="You will need access to this inbox to finish the change."
                error={emailError ?? undefined}
              >
                <Input
                  id="account-new-email"
                  type="email"
                  autoComplete="email"
                  value={newEmail}
                  aria-invalid={emailError ? true : undefined}
                  onChange={(event) => setNewEmail(event.target.value)}
                />
              </SettingField>
              <div className="flex gap-2">
                <Button onClick={() => void changeEmail()} disabled={pending === 'email'}>
                  {pending === 'email' && <Spinner className="size-3.5" />}
                  {pending === 'email' ? 'Saving…' : t('settings.saveChanges')}
                </Button>
                <Button variant="ghost" onClick={() => { setEditingEmail(false); setEmailError(null); }} disabled={pending === 'email'}>
                  {t('settings.cancel')}
                </Button>
              </div>
            </div>
          </SettingsEditor>
        )}

        <SettingsRow label="Account type" hint="Your role decides which workspace you land in. Support can change it for you.">
          <Badge variant="soft-neutral">{accountRoleLabel(profile?.user_type)}</Badge>
        </SettingsRow>

        {accountCreated && (
          <SettingsRow label="Account created">
            <SettingsValue>{accountCreated}</SettingsValue>
          </SettingsRow>
        )}

        <SettingsRow label="Your data" hint="What Syncareer stores, and how long it keeps it, is described in the policy.">
          <Link to="/privacy" className="text-sm text-primary underline underline-offset-2">
            Privacy policy
          </Link>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title="Security"
        description="Email and password sign-in. Two-step verification is not available yet."
      >
        <SettingsRow label="Password" hint="At least 8 characters. Changing it does not sign you out here.">
          <SettingsValue>••••••••</SettingsValue>
          {!editingPassword && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPasswordError(null);
                setEditingPassword(true);
              }}
            >
              {t('settings.changePassword')}
            </Button>
          )}
        </SettingsRow>

        {editingPassword && (
          <SettingsEditor>
            <div className="mx-auto max-w-md space-y-3">
              <SettingField id="account-new-password" label="New password" error={passwordError ?? undefined}>
                <Input
                  id="account-new-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={PASSWORD_MIN_LENGTH}
                  value={password}
                  aria-invalid={passwordError ? true : undefined}
                  aria-describedby={passwordError ? 'account-new-password-error' : undefined}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </SettingField>
              <SettingField id="account-confirm-password" label="Confirm new password">
                <Input
                  id="account-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </SettingField>
              <div className="flex gap-2">
                <Button onClick={() => void changePassword()} disabled={pending === 'password' || !password || !confirmPassword}>
                  {pending === 'password' && <Spinner className="size-3.5" />}
                  {pending === 'password' ? 'Updating…' : 'Update password'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setEditingPassword(false);
                    setPasswordError(null);
                  }}
                  disabled={pending === 'password'}
                >
                  {t('settings.cancel')}
                </Button>
              </div>
            </div>
          </SettingsEditor>
        )}

        <SettingsRow
          label="Other devices"
          hint="Ends your sessions on every other device or browser. This one stays signed in."
        >
          <Button variant="outline" size="sm" onClick={() => void signOutOtherSessions()} disabled={pending === 'devices'}>
            {pending === 'devices' ? 'Signing out…' : 'Sign out other sessions'}
          </Button>
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title="Close account"
        tone="danger"
        description="Permanent deletion of your profile, CVs, applications, assessments and history."
      >
        <div className="workspace-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
            There is no undo, and support cannot restore the data afterwards.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="shrink-0">
                Delete my account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes your profile, CVs, applications, assessments and activity. To
                  continue, type <span className="font-medium text-foreground">delete</span> below. You can
                  also write to {SUPPORT_EMAIL} first if something is wrong instead.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
                value={confirmText}
                onChange={(event) => setConfirmText(event.target.value)}
                placeholder="delete"
                aria-label="Type delete to confirm"
                autoComplete="off"
              />
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setConfirmText('')}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  disabled={confirmText.trim().toLowerCase() !== 'delete' || deleting}
                  onClick={() => void deleteAccount()}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? 'Deleting…' : 'Yes, delete my account'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </SettingsGroup>
    </div>
  );
}
