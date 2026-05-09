# Syncareer

AI-powered career platform for African graduates — career assessments, CV builder, interview practice, job matching, and counsellor marketplace.

## Run & Operate

- `pnpm --filter @workspace/syncareer run dev` — run the frontend (port from $PORT env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, react-router-dom
- Auth: Supabase Auth (`@supabase/supabase-js`) — email + password
- DB: Supabase (PostgreSQL) via `@supabase/supabase-js`
- API: Express 5 (port 8080)
- Payments: Paystack (`VITE_PAYSTACK_PUBLIC_KEY`)

## Where things live

- `artifacts/syncareer/public/landing/` — editorial hero + service photos used by the landing page
- `artifacts/syncareer/` — React frontend (main app)
- `artifacts/api-server/` — Express API server
- `artifacts/syncareer/src/lib/auth.tsx` — `AuthProvider` + `useAuth`/`useUser`/`useClerk`/`SignedIn`/`SignedOut` shim around `supabase.auth`
- `artifacts/syncareer/src/integrations/supabase/client.ts` — plain Supabase client
- `artifacts/syncareer/src/components/auth/` — `AuthShell`, `SignInForm`, `SignUpForm`, `ForgotPasswordForm`, `ResetPasswordForm`, `ProtectedRoute`, `AdminRoute`, `RoleRoute`
- `artifacts/syncareer/src/App.tsx` — Router, `AuthProvider`, sign-in/sign-up/reset pages
- `artifacts/syncareer/src/contexts/UserProfileContext.tsx` — user profile state

## Architecture decisions

- **Supabase Auth**: Plain email + password. The `auth.uid()` returned by RLS naturally matches `profiles.id` (UUID), so no UUID translation, no service-role bypass route is needed.
- **Compatibility shim at `@/lib/auth`**: Exposes Clerk-shaped APIs (`useAuth`, `useUser`, `useClerk`, `SignedIn`, `SignedOut`) backed by `supabase.auth` so the rest of the app didn't have to be rewritten when we removed Clerk. New code should import from `@/lib/auth` (not from `@supabase/supabase-js`) for hooks/components.
- **Onboarding** writes directly to `profiles` and the role-specific details table via `supabase.from(...)` using the signed-in user's UUID.

## Product

- Career assessment (5-minute quiz → career path recommendations)
- ATS-ready CV builder
- AI interview simulator
- Portfolio showcase with peer ratings
- Counsellor marketplace (booking, sessions, ratings)
- Employer dashboard (job posts, talent search)
- Admin dashboard
- Referral system, notification preferences, multilingual (i18n)

## User preferences

- Keep Supabase for database, auth, and edge functions
- Maintain Lovable ↔ GitHub ↔ Replit sync

## PWA / Offline

- `vite-plugin-pwa` (generateSW) is configured in `artifacts/syncareer/vite.config.ts`.
- Service worker is only registered in production builds (`devOptions.enabled: false`).
- Auth and any non-GET request use `NetworkOnly`. Supabase REST GETs use `NetworkFirst` (24h, 200 entries).
- Offline UX:
  - `src/components/OfflineBanner.tsx` — top banner + "back online" toast (mounted in `App.tsx`).
  - `src/components/InstallButton.tsx` — beforeinstallprompt; auto-hides when standalone (in landing nav).
  - `src/components/CachedDataIndicator.tsx` — "Showing cached data" pill + `OfflineEmptyState`.
  - `src/hooks/useOnlineStatus.ts`, `src/hooks/useOfflineDraft.ts` — drafts persisted to localStorage (debounced).
- Pages with offline draft persistence: `CVBuilder.tsx`, `Assessment.tsx`. Assessment auto-syncs queued submission when reconnected. Interview simulator gates "Start" when offline.
- `public/offline.html` is the navigateFallback for unreachable routes.
- Icons: `public/pwa-192x192.png`, `public/pwa-512x512.png` (existing).

## Gotchas

- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set as secrets
- Supabase email confirmation: if the Supabase project requires email confirmation on sign-up, new users will need to verify their email before they can sign in. Toggle this in the Supabase dashboard under Authentication → Providers → Email if you want one-click sign-up.
- Vite dev server caches env vars at startup — restart workflow after adding new secrets

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
