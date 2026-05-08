import { supabase } from '@/integrations/supabase/client';

interface SendNotificationParams {
  user_id: string;
  type: string;
  title: string;
  message: string;
  category?: string;
  link?: string;
  priority?: string;
}

/**
 * Sends a notification through the edge function, which checks user preferences
 * and delivers via in-app and/or email as appropriate.
 */
export async function sendNotification(params: SendNotificationParams): Promise<boolean> {
  try {
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: params,
    });

    if (error) {
      console.error('[sendNotification] Edge function error:', error);
      return false;
    }

    return data?.success === true;
  } catch (err) {
    console.error('[sendNotification] Failed:', err);
    return false;
  }
}
