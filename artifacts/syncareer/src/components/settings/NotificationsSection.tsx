import { AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useNotificationPreferences, type NotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useUserProfile } from '@/contexts/UserProfileContext';
import { SettingsGroup, SettingsRow } from './SettingsScaffold';

interface NotificationRow {
  id: keyof NotificationPreferences;
  label: string;
  description: string;
  /** Roles that never receive this category, so the switch would be a lie. */
  excludeRoles?: string[];
}

const CHANNEL_ROWS: NotificationRow[] = [
  { id: 'email_enabled', label: 'Email', description: 'Send the categories below as email.' },
  { id: 'push_enabled', label: 'In-app inbox', description: 'Show the same categories in the notification bell.' },
];

const ACTIVITY_ROWS: NotificationRow[] = [
  { id: 'application_updates', label: 'Application updates', description: 'Stage changes on the applications you track.', excludeRoles: ['career_counsellor'] },
  { id: 'interview_reminders', label: 'Interview preparation', description: 'Upcoming interviews and practice milestones.' },
  { id: 'counsellor_bookings', label: 'Mentor requests', description: 'Requests, confirmations and session changes.' },
];

const OCCASIONAL_ROWS: NotificationRow[] = [
  { id: 'weekly_digest', label: 'Weekly summary', description: 'One email a week with new matches and your open steps.' },
  { id: 'system_announcements', label: 'Service announcements', description: 'Maintenance, outages and meaningful product changes.' },
  { id: 'marketing_emails', label: 'Career tips', description: 'Occasional guidance and promotional content. Off by default.' },
];

/**
 * The real notification preference system (`notification_preferences`),
 * grouped by what a person is actually deciding: the channel, the career
 * activity, and the occasional mail. One switch per stored column — no
 * decorative toggles.
 */
export function NotificationsSection() {
  const { profile } = useUserProfile();
  const { preferences, loading, saving, error, updatePreference, refetch } = useNotificationPreferences();

  const visible = (rows: NotificationRow[]) => {
    const role = profile?.user_type ?? 'student';
    return rows.filter((row) => !row.excludeRoles?.includes(role));
  };

  const toggle = async (key: keyof NotificationPreferences, value: boolean) => {
    try {
      await updatePreference(key, value);
    } catch {
      toast.error('That change could not be saved. Try again.');
    }
  };

  const renderRows = (rows: NotificationRow[]) =>
    visible(rows).map((row) => (
      <SettingsRow key={row.id} label={row.label} hint={row.description}>
        <Switch
          id={`notification-${row.id}`}
          checked={preferences[row.id]}
          disabled={saving || loading}
          onCheckedChange={(value) => void toggle(row.id, value)}
          aria-label={row.label}
        />
      </SettingsRow>
    ));

  if (error) {
    return (
      <SettingsGroup title="Notifications" description="They could not be loaded.">
        <div className="workspace-row flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="size-4 text-destructive" aria-hidden="true" />
            {error}
          </p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        </div>
      </SettingsGroup>
    );
  }

  if (loading) {
    return (
      <SettingsGroup title="Notifications" description="Loading your saved preferences…">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="workspace-row flex items-center justify-between gap-4">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-36" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-9 rounded-pill" />
          </div>
        ))}
      </SettingsGroup>
    );
  }

  return (
    <div className="space-y-4">
      <SettingsGroup title="Delivery" description="Where a notification lands. Turn both off and Syncareer stays quiet.">
        {renderRows(CHANNEL_ROWS)}
      </SettingsGroup>

      <SettingsGroup title="Your activity" description="Things happening in your own applications, interviews and mentoring.">
        {renderRows(ACTIVITY_ROWS)}
      </SettingsGroup>

      <SettingsGroup
        title="Occasional email"
        description="Not tied to your own activity. Every Syncareer email also carries a one-click unsubscribe link."
      >
        {renderRows(OCCASIONAL_ROWS)}
      </SettingsGroup>
    </div>
  );
}
