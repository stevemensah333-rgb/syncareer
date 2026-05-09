import { supabase } from '@/integrations/supabase/client';

export interface SessionMessage {
  id: string;
  booking_id: string;
  sender_id: string;
  sender_type: 'counsellor' | 'student';
  message: string;
  created_at: string;
  read_at?: string;
}

export const messagingApi = {
  // Fetch all messages for a booking
  async getMessages(bookingId: string) {
    try {
      const { data, error } = await supabase
        .from('counsellor_messages')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as SessionMessage[];
    } catch (error) {
      console.error('[messagingApi] Error fetching messages:', error);
      throw error;
    }
  },

  // Send a message
  async sendMessage(
    bookingId: string,
    senderId: string,
    senderType: 'counsellor' | 'student',
    message: string
  ) {
    try {
      const { data, error } = await supabase
        .from('counsellor_messages')
        .insert({
          booking_id: bookingId,
          sender_id: senderId,
          sender_type: senderType,
          message,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data as SessionMessage;
    } catch (error) {
      console.error('[messagingApi] Error sending message:', error);
      throw error;
    }
  },

  // Mark messages as read
  async markAsRead(bookingId: string, userId: string) {
    try {
      const { error } = await supabase
        .from('counsellor_messages')
        .update({ read_at: new Date().toISOString() })
        .eq('booking_id', bookingId)
        .neq('sender_id', userId)
        .is('read_at', null);

      if (error) throw error;
    } catch (error) {
      console.error('[messagingApi] Error marking as read:', error);
      throw error;
    }
  },

  // Subscribe to real-time messages (polling fallback)
  subscribeToMessages(bookingId: string, callback: (messages: SessionMessage[]) => void) {
    const interval = setInterval(async () => {
      try {
        const messages = await this.getMessages(bookingId);
        callback(messages);
      } catch (error) {
        console.error('[messagingApi] Polling error:', error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  },
};
