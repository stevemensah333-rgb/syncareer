import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { CloudOff } from "lucide-react";

interface CachedDataIndicatorProps {
  hasData: boolean;
  className?: string;
}

/**
 * Shows a small "Showing cached data" pill when the user is offline AND has
 * previously loaded data. If offline with no cached data, the parent should
 * render a friendly empty state instead.
 */
export default function CachedDataIndicator({
  hasData,
  className = "",
}: CachedDataIndicatorProps) {
  const isOnline = useOnlineStatus();
  if (isOnline || !hasData) return null;
  return (
    <div
      className={
        "inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-800 " +
        className
      }
    >
      <CloudOff className="h-3 w-3" />
      <span>Showing cached data — reconnect to refresh</span>
    </div>
  );
}

interface OfflineEmptyStateProps {
  message?: string;
  className?: string;
}

export function OfflineEmptyState({
  message = "This page needs internet the first time. Reconnect to load.",
  className = "",
}: OfflineEmptyStateProps) {
  return (
    <div
      className={
        "flex flex-col items-center justify-center gap-3 py-16 text-center " +
        className
      }
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <CloudOff className="h-5 w-5" />
      </div>
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
    </div>
  );
}
