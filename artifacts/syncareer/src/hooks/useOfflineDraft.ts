import { useCallback, useEffect, useRef, useState } from "react";

const PREFIX = "syncareer:draft:";

function storageKey(scope: string, userId: string | null | undefined): string {
  return `${PREFIX}${scope}:${userId ?? "anon"}`;
}

export interface UseOfflineDraftResult<T> {
  draft: T | null;
  saveDraft: (data: T) => void;
  clearDraft: () => void;
  hasDraft: boolean;
  lastSavedAt: number | null;
}

/**
 * Persist arbitrary form/work-in-progress state to localStorage so it survives
 * reloads and is available offline. Reads on mount, writes (debounced) on change.
 */
export function useOfflineDraft<T>(
  scope: string,
  userId: string | null | undefined,
  options: { debounceMs?: number } = {},
): UseOfflineDraftResult<T> {
  const { debounceMs = 500 } = options;
  const key = storageKey(scope, userId);
  const [draft, setDraft] = useState<T | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data: T; ts: number };
      return parsed?.data ?? null;
    } catch {
      return null;
    }
  });
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data: T; ts: number };
      return parsed?.ts ?? null;
    } catch {
      return null;
    }
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const saveDraft = useCallback(
    (data: T) => {
      setDraft(data);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        try {
          const ts = Date.now();
          window.localStorage.setItem(key, JSON.stringify({ data, ts }));
          setLastSavedAt(ts);
        } catch {
          // quota exceeded or storage disabled — fail silently
        }
      }, debounceMs);
    },
    [key, debounceMs],
  );

  const clearDraft = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* noop */
    }
    setDraft(null);
    setLastSavedAt(null);
  }, [key]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return {
    draft,
    saveDraft,
    clearDraft,
    hasDraft: draft !== null,
    lastSavedAt,
  };
}
