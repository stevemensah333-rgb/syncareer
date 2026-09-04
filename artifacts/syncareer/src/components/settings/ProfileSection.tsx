import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { accountRoleLabel } from '@/lib/accountRoles';
import { EducationSection } from './EducationSection';
import { QualificationsSection } from './QualificationsSection';
import { SettingField, SettingsEditor, SettingsGroup, SettingsRow, SettingsValue } from './SettingsScaffold';

const BIO_MAX_LENGTH = 500;

interface IdentityForm {
  fullName: string;
  username: string;
  bio: string;
  linkedinUrl: string;
}

interface IdentityErrors {
  fullName?: string;
  username?: string;
  linkedinUrl?: string;
}

const emptyForm: IdentityForm = { fullName: '', username: '', bio: '', linkedinUrl: '' };

/** The rules the profile record itself needs: a name that exists, and a handle
 *  that can be shown as `@handle`. */
function validateIdentity(form: IdentityForm): IdentityErrors {
  const errors: IdentityErrors = {};
  const name = form.fullName.trim();
  if (name.length < 2) errors.fullName = 'Enter your full name (at least 2 characters).';
  else if (name.length > 80) errors.fullName = 'Keep your name under 80 characters.';

  const username = form.username.trim();
  if (username && !/^[a-z0-9_.]{3,30}$/.test(username)) {
    errors.username = 'Use 3–30 characters: lowercase letters, numbers, dot or underscore.';
  }

  const linkedin = form.linkedinUrl.trim();
  if (linkedin && !/^https?:\/\/\S+$/.test(linkedin)) {
    errors.linkedinUrl = 'Enter the full link, starting with https://';
  }
  return errors;
}

/**
 * Profile is the human-facing identity record. Every editable field is a real
 * column on `profiles` that RLS lets the owner write; what the backend does not
 * let a user change here (email, role, avatar upload) is displayed, never
 * mocked. Each group carries its own edit affordance so the page stays a
 * record to read rather than one enormous form.
 */
export function ProfileSection() {
  const { profile, loading, refreshProfile } = useUserProfile();
  const { userId, user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<IdentityForm>(emptyForm);
  const [errors, setErrors] = useState<IdentityErrors>({});

  const email = user?.email ?? '';

  const startEdit = () => {
    setForm({
      fullName: profile?.full_name ?? '',
      username: profile?.username ?? '',
      bio: profile?.bio ?? '',
      linkedinUrl: profile?.linkedin_url ?? '',
    });
    setErrors({});
    setEditing(true);
  };

  const save = async () => {
    if (!userId) return;
    const nextErrors = validateIdentity(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.fullName.trim(),
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        linkedin_url: form.linkedinUrl.trim() || null,
      })
      .eq('id', userId);

    if (error) {
      setSaving(false);
      toast.error(error.message || 'Your profile could not be saved.');
      return;
    }

    await refreshProfile();
    setSaving(false);
    setEditing(false);
    toast.success('Profile updated');
  };

  const initials = (profile?.full_name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="space-y-4">
      <SettingsGroup
        title="Identity"
        description="What Syncareer shows about you."
        action={
          !editing && (
            <Button variant="outline" size="sm" onClick={startEdit} disabled={loading || !profile}>
              <Pencil className="size-3.5" aria-hidden="true" />
              Edit
            </Button>
          )
        }
      >
        <div className="workspace-row flex items-center gap-3">
          <Avatar className="size-11 border">
            <AvatarImage src={profile?.avatar_url ?? undefined} alt="" />
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {initials || '—'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">
              {profile?.full_name || 'Add your name'}
            </p>
            <p className="type-metadata truncate">{email || 'Signed in'}</p>
          </div>
          <Badge variant="soft-neutral" className="shrink-0">
            {accountRoleLabel(profile?.user_type)}
          </Badge>
        </div>

        <SettingsRow
          label="Username"
          hint={profile?.username ? `Shown as @${profile.username}` : 'An optional handle for your account.'}
        >
          <SettingsValue>{profile?.username ? `@${profile.username}` : 'Not set'}</SettingsValue>
        </SettingsRow>

        <SettingsRow label="Email" hint="Your sign-in address lives with your security settings.">
          <SettingsValue>{email || 'Unavailable'}</SettingsValue>
        </SettingsRow>

        <SettingsRow label="Account type" hint="Set when you joined; ask support if it is wrong.">
          <SettingsValue>{accountRoleLabel(profile?.user_type)}</SettingsValue>
        </SettingsRow>

        <SettingsRow label="Profile picture" hint="Syncareer has no image upload of its own.">
          <SettingsValue>{profile?.avatar_url ? 'Shown from your account image' : 'Your initials are used'}</SettingsValue>
        </SettingsRow>

        <SettingsRow label="Summary" hint="A short note on what you study or do.">
          <SettingsValue>{profile?.bio || 'Not added'}</SettingsValue>
        </SettingsRow>

        <SettingsRow label="LinkedIn" hint="Stored on your profile record.">
          {profile?.linkedin_url ? (
            <a
              href={profile.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="max-w-full truncate text-sm text-primary underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {profile.linkedin_url}
            </a>
          ) : (
            <SettingsValue>Not added</SettingsValue>
          )}
        </SettingsRow>

        {editing && (
          <SettingsEditor>
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void save();
              }}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <SettingField id="profile-name" label="Full name" error={errors.fullName}>
                  <Input
                    id="profile-name"
                    value={form.fullName}
                    maxLength={80}
                    autoComplete="name"
                    aria-invalid={errors.fullName ? true : undefined}
                    aria-describedby={errors.fullName ? 'profile-name-error' : undefined}
                    onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  />
                </SettingField>
                <SettingField
                  id="profile-username"
                  label="Username"
                  hint="Optional. Lowercase letters, numbers, dot or underscore."
                  error={errors.username}
                >
                  <Input
                    id="profile-username"
                    value={form.username}
                    maxLength={30}
                    aria-invalid={errors.username ? true : undefined}
                    aria-describedby={errors.username ? 'profile-username-error' : 'profile-username-hint'}
                    onChange={(event) => setForm({ ...form, username: event.target.value })}
                  />
                </SettingField>
              </div>

              <SettingField id="profile-bio" label="Summary" hint={`${form.bio.length}/${BIO_MAX_LENGTH}`}>
                <Textarea
                  id="profile-bio"
                  rows={3}
                  maxLength={BIO_MAX_LENGTH}
                  value={form.bio}
                  onChange={(event) => setForm({ ...form, bio: event.target.value })}
                />
              </SettingField>

              <SettingField id="profile-linkedin" label="LinkedIn" hint="Full URL, including https://" error={errors.linkedinUrl}>
                <Input
                  id="profile-linkedin"
                  type="url"
                  value={form.linkedinUrl}
                  placeholder="https://linkedin.com/in/…"
                  aria-invalid={errors.linkedinUrl ? true : undefined}
                  aria-describedby={errors.linkedinUrl ? 'profile-linkedin-error' : 'profile-linkedin-hint'}
                  onChange={(event) => setForm({ ...form, linkedinUrl: event.target.value })}
                />
              </SettingField>

              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          </SettingsEditor>
        )}
      </SettingsGroup>

      <EducationSection />

      <QualificationsSection />

      <p className="type-supporting px-1">
        Password, email address and account closure live in{' '}
        <Link to="/settings?tab=account" className="text-primary underline underline-offset-2">
          Account &amp; Security
        </Link>
        .
      </p>
    </div>
  );
}
