import { useEffect, useState, useCallback } from 'react';
import { messagingApi, type SessionMessage } from '@/lib/messagingApi';

export function useSessionMessages(bookingId: string) {
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial messages
  useEffect(() => {
    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await messagingApi.getMessages(bookingId);
        setMessages(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [bookingId]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = messagingApi.subscribeToMessages(bookingId, (newMessages) => {
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [bookingId]);

  // Send message function
  const sendMessage = useCallback(
    async (senderId: string, senderType: 'counsellor' | 'student', text: string) => {
      try {
        const newMessage = await messagingApi.sendMessage(bookingId, senderId, senderType, text);
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMsg);
        throw err;
      }
    },
    [bookingId]
  );

  // Mark messages as read
  const markAsRead = useCallback(
    async (userId: string) => {
      try {
        await messagingApi.markAsRead(bookingId, userId);
      } catch (err) {
        console.error('[useSessionMessages] Failed to mark as read:', err);
      }
    },
    [bookingId]
  );

  return { messages, loading, error, sendMessage, markAsRead };
}
