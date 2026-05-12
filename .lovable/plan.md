## Root cause

The crash on `/interview-simulator` (and any other page that mounts more than one consumer of `useSubscription` / `useNotifications`, including React StrictMode double-mounts) is:

```
Error: cannot add `postgres_changes` callbacks for realtime:subscriptions-realtime after `subscribe()`.
   at useSubscription.ts:40
```

`useSubscription` and `useNotifications` both create a Supabase Realtime channel with a **hard-coded topic name** (`'subscriptions-realtime'`, `'notifications-realtime'`). Supabase's client returns the *same* channel object for the same topic, so the second hook instance gets a channel that has already been `.subscribe()`-d, and calling `.on('postgres_changes', ...)` on it throws — bubbling up past `GlobalErrorBoundary`.

This is the only "crash" currently reproducible from the logs; sign-in itself does not crash, but the app crashes anywhere these hooks are mounted twice (e.g. `MobileBottomNav` + a page using subscription gating, or strict-mode double-render).

## What to change

1. `artifacts/syncareer/src/hooks/useSubscription.ts`
   - Generate a unique channel topic per hook instance: `` `subscriptions-realtime-${useId()}` `` (or `crypto.randomUUID()` stored in a ref).
   - Move `.on(...)` *before* `.subscribe()` (already correct, but keep it explicit).
   - Guard cleanup with `channelRef.current = null` after `removeChannel`.

2. `artifacts/syncareer/src/hooks/useNotifications.ts`
   - Same fix: unique per-instance topic, null-out ref on cleanup.

3. Add a defensive note: any future `supabase.channel('...')` calls in hooks must use a unique topic per instance.

4. Verify no other shared-topic channels exist (already checked — only these two files use `.channel(`).

5. `PUBLISH_TROUBLESHOOTING.md` — append a short "Realtime channel collision" section documenting the pattern and the fix, so this doesn't regress.

## Out of scope

- Sign-in flow: no crash signal in logs/replay; current code is fine. No changes needed.
- "Unnecessary delays": the only delay surfaced is the `Suspense` fallback during lazy-load of `InterviewSimulator`, which is by design. Will not touch unless a specific slow path appears after the crash fix.

## Verification

- Reload `/interview-simulator` — no `GlobalErrorBoundary` trigger, page renders.
- Open a page that mounts `useSubscription` twice (e.g. dashboard with `MobileBottomNav` + gated content) — no error.
- Confirm no `postgres_changes` error in console after navigating between pages.
