import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useSessionMessages } from '@/hooks/useSessionMessages';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SessionMessagingProps {
  bookingId: string;
  clientName: string;
}

export function SessionMessaging({ bookingId, clientName }: SessionMessagingProps) {
  const { user } = useAuth();
  const { messages, loading, sendMessage, markAsRead } = useSessionMessages(bookingId);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark as read when component mounts and when new messages arrive
  useEffect(() => {
    if (user?.id && messages.length > 0) {
      markAsRead(user.id);
    }
  }, [messages, user?.id, markAsRead]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageText.trim() || !user?.id) return;

    try {
      setSending(true);
      await sendMessage(user.id, 'counsellor', messageText.trim());
      setMessageText('');
    } catch (error) {
      console.error('[SessionMessaging] Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-96">
      {/* Header */}
      <div className="px-4 py-3 border-b bg-background rounded-t-lg">
        <h3 className="text-sm font-semibold">Chat with {clientName}</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {messages.length} message{messages.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
              No messages yet. Start the conversation!
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'counsellor' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                    msg.sender_type === 'counsellor'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  }`}
                >
                  <p className="break-words">{msg.message}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender_type === 'counsellor'
                      ? 'text-primary-foreground/70'
                      : 'text-muted-foreground'
                  }`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-background rounded-b-lg">
        <div className="flex gap-2">
          <Input
            placeholder="Type a message..."
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            disabled={sending}
            className="text-sm"
          />
          <Button
            type="submit"
            disabled={sending || !messageText.trim()}
            size="sm"
            className="px-3"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
