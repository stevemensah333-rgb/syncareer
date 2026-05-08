import { Bell, Briefcase, Calendar, MessageSquare, Star, Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onClick: (notification: Notification) => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  application: <Briefcase className="h-4 w-4" />,
  interview: <Calendar className="h-4 w-4" />,
  message: <MessageSquare className="h-4 w-4" />,
  booking: <Calendar className="h-4 w-4" />,
  review: <Star className="h-4 w-4" />,
  system: <AlertTriangle className="h-4 w-4" />,
};

function getIcon(type: string) {
  return ICON_MAP[type] || <Bell className="h-4 w-4" />;
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getPriorityLabel(priority: string): string | null {
  if (priority === 'urgent') return 'Urgent';
  if (priority === 'high') return 'Important';
  return null;
}

export function NotificationItem({ notification, onRead, onDelete, onClick }: NotificationItemProps) {
  const priorityLabel = getPriorityLabel(notification.priority);

  return (
    <div
      role="article"
      aria-label={`${notification.is_read ? '' : 'Unread: '}${notification.title}`}
      tabIndex={0}
      className={cn(
        'p-4 hover:bg-muted/50 cursor-pointer transition-colors relative group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
        !notification.is_read && 'bg-primary/5',
        notification.priority === 'urgent' && 'border-l-2 border-l-destructive',
        notification.priority === 'high' && 'border-l-2 border-l-warning'
      )}
      onClick={() => onClick(notification)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(notification);
        }
      }}
    >
      <div className="flex gap-3">
        <div
          className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center shrink-0',
            notification.is_read
              ? 'bg-muted text-muted-foreground'
              : 'bg-primary/10 text-primary'
          )}
          aria-hidden="true"
        >
          {getIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={cn(
                'text-sm font-medium leading-tight',
                !notification.is_read && 'text-foreground'
              )}
            >
              {notification.title}
            </p>
            {priorityLabel && (
              <span
                className={cn(
                  'text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0',
                  notification.priority === 'urgent'
                    ? 'bg-destructive/10 text-destructive'
                    : 'bg-warning/10 text-warning'
                )}
              >
                {priorityLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            <time dateTime={notification.created_at}>{getTimeAgo(notification.created_at)}</time>
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity shrink-0"
          onClick={(e) => onDelete(notification.id, e)}
          aria-label={`Delete notification: ${notification.title}`}
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </Button>
      </div>
      {!notification.is_read && (
        <div
          className="absolute left-1 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary"
          aria-hidden="true"
        />
      )}
    </div>
  );
}
