import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendNotification } from './notifications';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

describe('authoritative notifications (Supabase edge function & realtime)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends a notification via send-notification edge function and returns true on success', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
      data: { success: true },
      error: null,
    });

    const success = await sendNotification({
      user_id: 'user-123',
      type: 'activity-reminder',
      title: 'Reminder',
      message: 'Complete your assessment',
    });

    expect(success).toBe(true);
    expect(supabase.functions.invoke).toHaveBeenCalledWith('send-notification', {
      body: {
        user_id: 'user-123',
        type: 'activity-reminder',
        title: 'Reminder',
        message: 'Complete your assessment',
      },
    });
  });

  it('returns false when edge function returns error or throws', async () => {
    vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(
      new Error('Network error')
    );

    const success = await sendNotification({
      user_id: 'user-123',
      type: 'info',
      title: 'Info',
      message: 'Hello',
    });

    expect(success).toBe(false);
  });
});
