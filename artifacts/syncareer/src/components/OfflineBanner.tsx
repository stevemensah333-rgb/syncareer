import { useEffect, useState } from "react";
import { WifiOff, X } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export default function OfflineBanner() {
  const isOnline = useOnlineStatus();
  const [dismissed, setDismissed] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [showBackOnline, setShowBackOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setDismissed(false);
      setWasOffline(true);
      setShowBackOnline(false);
      return;
    }
    if (wasOffline) {
      setShowBackOnline(true);
      const t = setTimeout(() => setShowBackOnline(false), 3000);
      return () => clearTimeout(t);
    }
    return;
  }, [isOnline, wasOffline]);

  if (isOnline && !showBackOnline) return null;
  if (!isOnline && dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-[60] flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium shadow-md transition-colors ${
        isOnline
          ? "bg-emerald-600 text-white"
          : "bg-amber-500 text-amber-950"
      }`}
    >
      {isOnline ? (
        <span>Back online — your changes will sync.</span>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          <span>
            You&apos;re offline — drafts are saved locally and will sync when
            you reconnect.
          </span>
          <button
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full hover:bg-amber-600/20"
          >
            <X className="h-3 w-3" />
          </button>
        </>
      )}
    </div>
  );
}
