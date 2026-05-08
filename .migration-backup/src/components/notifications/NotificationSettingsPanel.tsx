import { useNotificationPreferences, type NotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useMemo } from 'react';

interface PreferenceRowProps {
  id: keyof NotificationPreferences;
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onToggle: (key: keyof NotificationPreferences, value: boolean) => void;
}

function PreferenceRow({ id, label, description, checked, disabled, onToggle }: PreferenceRowProps) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div className="flex-1 pr-4">
        <Label htmlFor={id} className="font-medium cursor-pointer">
          {label}
        </Label>
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(value) => onToggle(id, value)}
        aria-describedby={`${id}-desc`}
      />
      <span id={`${id}-desc`} className="sr-only">
        {description}
      </span>
    </div>
  );
}

const CHANNEL_SETTINGS: { id: keyof NotificationPreferences; label: string; description: string }[] = [
  {
    id: 'email_enabled',
    label: 'Email Notifications',
    description: 'Receive important updates via email',
  },
  {
    id: 'push_enabled',
    label: 'In-App Notifications',
    description: 'Show notifications in the app',
  },
  {
    id: 'weekly_digest',
    label: 'Weekly Digest',
    description: 'Get a weekly summary of your activity',
  },
];

const ALL_CATEGORY_SETTINGS: { id: keyof NotificationPreferences; label: string; description: string; excludeRoles?: string[] }[] = [
  {
    id: 'application_updates',
    label: 'Application Updates',
    description: 'Status changes on your job applications',
    excludeRoles: ['counsellor'],
  },
  {
    id: 'interview_reminders',
    label: 'Interview Reminders',
    description: 'Upcoming interviews and prep milestones',
  },
  {
    id: 'counsellor_bookings',
    label: 'Counsellor Bookings',
    description: 'Booking confirmations and session updates',
    excludeRoles: ['employer'],
  },
  {
    id: 'system_announcements',
    label: 'System Announcements',
    description: 'Platform updates and new features',
  },
  {
    id: 'marketing_emails',
    label: 'Marketing & Tips',
    description: 'Career tips and promotional content',
  },
];

export function NotificationSettingsPanel() {
  const { profile } = useUserProfile();
  const { preferences, loading, saving, error, updatePreference, refetch } =
    useNotificationPreferences();

  const categorySettings = useMemo(() => {
    const role = profile?.user_type || 'student';
    return ALL_CATEGORY_SETTINGS.filter(s => !s.excludeRoles?.includes(role));
  }, [profile?.user_type]);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await updatePreference(key, value);
      toast.success('Preference updated');
    } catch {
      toast.error('Failed to update preference');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4" role="status" aria-label="Loading preferences">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between py-3 border-b">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-9 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground" role="alert">
        <AlertCircle className="h-8 w-8 mb-2 text-destructive/60" />
        <p className="text-sm mb-2">Could not load notification preferences</p>
        <Button variant="ghost" size="sm" onClick={refetch}>
          <RefreshCw className="h-3 w-3 mr-1" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-medium mb-3">Delivery Channels</h3>
        <div className="space-y-1">
          {CHANNEL_SETTINGS.map((setting) => (
            <PreferenceRow
              key={setting.id}
              {...setting}
              checked={preferences[setting.id]}
              disabled={saving}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>

      <section>
        <h3 className="text-base font-medium mb-3">Notification Categories</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Choose which types of notifications you want to receive.
        </p>
        <div className="space-y-1">
          {categorySettings.map((setting) => (
            <PreferenceRow
              key={setting.id}
              {...setting}
              checked={preferences[setting.id]}
              disabled={saving}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
