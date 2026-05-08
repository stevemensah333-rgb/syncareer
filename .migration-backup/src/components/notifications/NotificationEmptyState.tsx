import { Bell, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NotificationEmptyStateProps {
  type: 'empty' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

export function NotificationEmptyState({ type, errorMessage, onRetry }: NotificationEmptyStateProps) {
  if (type === 'error') {
    return (
      <div
        className="flex flex-col items-center justify-center h-32 text-muted-foreground px-4"
        role="alert"
      >
        <AlertCircle className="h-8 w-8 mb-2 text-destructive/60" />
        <p className="text-sm text-center">
          {errorMessage || 'Could not load notifications'}
        </p>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="mt-2"
            aria-label="Retry loading notifications"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center h-32 text-muted-foreground"
      role="status"
    >
      <Bell className="h-8 w-8 mb-2 opacity-50" aria-hidden="true" />
      <p className="text-sm">No notifications yet</p>
    </div>
  );
}
