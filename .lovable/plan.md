# Plan: Fix false offline banner + stability sweep

## Problem
When signing in (especially as counsellor), the "You're offline" banner appears even though the user is online. Network requests in logs confirm the user IS online (200s from Supabase). The cause is `navigator.onLine` returning a false negative — common in iframes / right after auth navigation — and `OfflineBanner` trusting it without verification.

## Root cause
`src/hooks/useOnlineStatus.ts` returns `navigator.onLine` directly. The browser's `onLine` flag is unreliable: it can report `false` in iframes (the Lovable preview is one), during page transitions, or right after a service-worker takeover. Once `wasOffline` flips to `true`, the banner sticks until a real `online` event fires — which never comes if it was never truly offline.

## Fix strategy

### 1. Make online detection reliable (primary fix)
Update `useOnlineStatus` to:
- Default to `true` (assume online) on first render.
- Only flip to `false` when an actual fetch probe fails, not on `navigator.onLine` alone.
- Re-verify with a lightweight HEAD/GET to a known endpoint (Supabase REST root or `/favicon.svg`) before declaring offline.
- Listen to `online`/`offline` events as hints, but confirm with a probe.

### 2. Stop the banner from latching
In `OfflineBanner`:
- Don't set `wasOffline=true` unless we've been offline for >2s (debounce).
- Auto-clear stale offline state on route change.

### 3. Stability sweep (verify, don't rewrite)
Read-only verification pass — no changes unless an actual bug is found:

- **Auth/Sign-in (student + counsellor):** confirm `ProtectedRoute` + `RoleRoute` flow, no double-redirect loops, profile loads via `.maybeSingle()`.
- **Onboarding:** confirm role selection persists `user_type` and `onboarding_completed` correctly for both roles.
- **Counsellor pages:** Dashboard, Availability, Sessions, Clients, Credential upload — verify each mounts without crash and queries return safely on empty data.
- **Student pages:** Dashboard, Assessment, CV Builder, Interview Simulator, AI Coach, Opportunities, Portfolio, Applications — verify each mounts.
- **Realtime hooks:** confirm the previous channel-collision fix is still in place in `useSubscription` and `useNotifications`.
- **Lazy-loaded routes:** verify Suspense fallback resolves (no infinite spinners).
- **Error boundary:** confirm `GlobalErrorBoundary` catches and shows recovery UI rather than blank screen.

Any concrete crash or hang found during the sweep will be listed and fixed; the user will be told what was checked vs. what was changed.

## Files to change
- `artifacts/syncareer/src/hooks/useOnlineStatus.ts` — probe-based detection
- `artifacts/syncareer/src/components/OfflineBanner.tsx` — debounce offline state, clear on mount

## Out of scope
- Removing offline draft features (CV, Assessment, Interview practice) — they stay; only the false-positive banner is fixed.
- Backend / RLS changes.
