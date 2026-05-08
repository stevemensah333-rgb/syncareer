import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationPreferences {
  email_enabled: boolean;
  push_enabled: boolean;
  application_updates: boolean;
  interview_reminders: boolean;
  counsellor_bookings: boolean;
  system_announcements: boolean;
  marketing_emails: boolean;
  weekly_digest: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  email_enabled: true,
  push_enabled: true,
  application_updates: true,
  interview_reminders: true,
  counsellor_bookings: true,
  system_announcements: true,
  marketing_emails: false,
  weekly_digest: false,
};

export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreferences = useCallback(async () => {
    try {
      setError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { data, error: fetchError } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        setPreferences({
          email_enabled: data.email_enabled,
          push_enabled: data.push_enabled,
          application_updates: data.application_updates,
          interview_reminders: data.interview_reminders,
          counsellor_bookings: data.counsellor_bookings,
          system_announcements: data.system_announcements,
          marketing_emails: data.marketing_emails,
          weekly_digest: data.weekly_digest,
        });
      } else {
        // Create default preferences for existing users
        await supabase
          .from('notification_preferences')
          .insert({ user_id: session.user.id });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load preferences';
      console.error('[NotificationPrefs] Fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(
    async (key: keyof NotificationPreferences, value: boolean) => {
      const previousValue = preferences[key];

      // Optimistic update
      setPreferences((prev) => ({ ...prev, [key]: value }));

      try {
        setSaving(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { error: updateError } = await supabase
          .from('notification_preferences')
          .update({ [key]: value })
          .eq('user_id', session.user.id);

        if (updateError) throw updateError;
      } catch (err) {
        // Rollback
        setPreferences((prev) => ({ ...prev, [key]: previousValue }));
        console.error('[NotificationPrefs] Update error:', err);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [preferences]
  );

  return {
    preferences,
    loading,
    saving,
    error,
    updatePreference,
    refetch: fetchPreferences,
  };
}
