import React from 'react';
import { useNotifications } from '@/contexts/NotificationContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Bell, Trash2 } from 'lucide-react';
import { trackEvent } from '@/services/analytics';

interface NotificationCenterProps {
  isOpen?: boolean;
  onClose?: () => void;
}

/**
 * Notification center component for displaying and managing notifications
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen = true,
  onClose,
}) => {
  const { notifications, markAsRead, removeNotification, markAllAsRead, clearAll } = useNotifications();

  if (!isOpen || notifications.length === 0) {
    return null;
  }

  const handleNotificationClick = (notificationId: string) => {
    markAsRead(notificationId);
    trackEvent({
      event: 'notification_clicked',
      properties: {
        notification_type: notifications.find(n => n.id === notificationId)?.type || 'unknown',
        action: 'view',
      },
    });
  };

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, string> = {
      'incomplete-assessment': '📊',
      'new-job-match': '💼',
      'profile-suggestion': '👤',
      'activity-reminder': '⏰',
      'success': '✅',
      'info': 'ℹ️',
      'warning': '⚠️',
      'error': '❌',
    };
    return icons[type] || '📢';
  };

  return (
    <div className="w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 px-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Notifications</h2>
          {notifications.filter(n => !n.read).length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {notifications.filter(n => !n.read).length}
            </Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Notifications list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {notifications.map((notification) => (
          <Card
            key={notification.id}
            className={`cursor-pointer transition-colors ${
              notification.read ? 'bg-background' : 'bg-primary/5 border-primary/20'
            }`}
            onClick={() => handleNotificationClick(notification.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{notification.title}</p>
                  <p className="text-xs text-foreground/60 mt-1">{notification.message}</p>
                  {notification.action && (
                    <button
                      className="text-xs text-primary hover:underline mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        notification.action?.onClick?.();
                      }}
                    >
                      {notification.action.label}
                    </button>
                  )}
                  <p className="text-xs text-foreground/40 mt-2">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(notification.id);
                  }}
                  className="flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 px-4">
        <Button
          variant="outline"
          size="sm"
          onClick={markAllAsRead}
          className="flex-1"
        >
          Mark all as read
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={clearAll}
          className="flex-1 text-destructive"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear all
        </Button>
      </div>
    </div>
  );
};
