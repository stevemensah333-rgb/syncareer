import { useEffect, useRef, useState } from "react";

/**
 * Reliable online detection.
 *
 * `navigator.onLine` is unreliable inside iframes (e.g. the Lovable preview),
 * during page transitions, and on some browsers right after auth navigation.
 * It can report `false` even when the network is fine.
 *
 * Strategy:
 * - Default to `true` (assume online).
 * - Treat `online`/`offline` events as hints only.
 * - Before declaring offline, run a lightweight probe to confirm.
 * - Debounce so transient blips don't flash the banner.
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const probeTimer = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const probe = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const t = window.setTimeout(() => controller.abort(), 4000);
        // Same-origin, cache-busted, no-cors-friendly request.
        await fetch(`/favicon.svg?_=${Date.now()}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        window.clearTimeout(t);
        return true;
      } catch {
        return false;
      }
    };

    const verifyOffline = () => {
      if (probeTimer.current) window.clearTimeout(probeTimer.current);
      probeTimer.current = window.setTimeout(async () => {
        const ok = await probe();
        if (!cancelled) setIsOnline(ok);
      }, 1500); // debounce — ignore brief blips
    };

    const handleOnline = () => {
      if (probeTimer.current) {
        window.clearTimeout(probeTimer.current);
        probeTimer.current = null;
      }
      setIsOnline(true);
    };

    const handleOffline = () => {
      // Don't trust the event — confirm with a probe first.
      verifyOffline();
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // If the browser claims we're offline at mount, verify before showing UI.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      verifyOffline();
    }

    return () => {
      cancelled = true;
      if (probeTimer.current) window.clearTimeout(probeTimer.current);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}
