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

  function readFromStorage(k: string): { data: T | null; ts: number | null } {
    if (typeof window === "undefined") return { data: null, ts: null };
    try {
      const raw = window.localStorage.getItem(k);
      if (!raw) return { data: null, ts: null };
      const parsed = JSON.parse(raw) as { data: T; ts: number };
      return { data: parsed?.data ?? null, ts: parsed?.ts ?? null };
    } catch {
      return { data: null, ts: null };
    }
  }

  const initial = readFromStorage(key);
  const [draft, setDraft] = useState<T | null>(initial.data);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(initial.ts);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKeyRef = useRef<string>(key);

  // Re-hydrate from localStorage whenever the storage key changes (e.g. when
  // Clerk's userId loads after initial render and we transition from "anon"
  // to a real user-scoped key).
  useEffect(() => {
    if (lastKeyRef.current === key) return;
    lastKeyRef.current = key;
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const next = readFromStorage(key);
    setDraft(next.data);
    setLastSavedAt(next.ts);
  }, [key]);

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
