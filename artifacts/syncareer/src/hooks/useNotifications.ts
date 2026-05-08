import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  priority: string;
  category: string;
  created_at: string;
}

const MAX_RETRIES = 3;
const RETRY_BASE_DELAY = 1000;
const DEBOUNCE_MS = 500;

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES
): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === retries) throw error;
      const delay = RETRY_BASE_DELAY * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      console.warn(`[Notifications] Retry attempt ${attempt + 1}/${retries}`);
    }
  }
  throw new Error('Unreachable');
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchWithRetry(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return [];

        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return (data || []) as Notification[];
      });

      setNotifications(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      console.error('[Notifications] Fetch error:', message);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced refetch to prevent flooding from realtime events
  const debouncedRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchNotifications();
    }, DEBOUNCE_MS);
  }, [fetchNotifications]);

  useEffect(() => {
    fetchNotifications();

    // Set up realtime subscription with debounce
    channelRef.current = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        () => {
          debouncedRefetch();
        }
      )
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [fetchNotifications, debouncedRefetch]);

  const markAsRead = useCallback(async (notificationId: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      // Rollback
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: false } : n))
      );
      console.error('[Notifications] Mark read failed:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const previousState = notifications;

    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', session.user.id)
        .eq('is_read', false);

      if (error) throw error;
    } catch (err) {
      // Rollback
      setNotifications(previousState);
      console.error('[Notifications] Mark all read failed:', err);
    }
  }, [notifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const previousState = notifications;

    // Optimistic update
    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      // Rollback
      setNotifications(previousState);
      console.error('[Notifications] Delete failed:', err);
    }
  }, [notifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // Group notifications by priority for rendering
  const groupedNotifications = {
    urgent: notifications.filter((n) => n.priority === 'urgent'),
    high: notifications.filter((n) => n.priority === 'high'),
    normal: notifications.filter((n) => n.priority === 'normal' || n.priority === 'low'),
  };

  return {
    notifications,
    groupedNotifications,
    loading,
    error,
    unreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    refetch: fetchNotifications,
  };
}
