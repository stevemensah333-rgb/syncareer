# Syncareer

AI-powered career platform for African graduates — career assessments, CV builder, interview practice, job matching, and counsellor marketplace.

## Run & Operate

- `pnpm --filter @workspace/syncareer run dev` — run the frontend (port from $PORT env)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, react-router-dom
- Auth: Clerk (`@clerk/react`)
- DB: Supabase (PostgreSQL) via `@supabase/supabase-js`
- API: Express 5 (port 8080) with Clerk proxy middleware
- Payments: Paystack (`VITE_PAYSTACK_PUBLIC_KEY`)

## Where things live

- `artifacts/syncareer/` — React frontend (main app)
- `artifacts/api-server/` — Express API server
- `artifacts/syncareer/src/integrations/supabase/client.ts` — Supabase client + Clerk auth shim
- `artifacts/syncareer/src/App.tsx` — Router, ClerkProvider, AuthBridge, sign-in/sign-up pages
- `artifacts/syncareer/src/contexts/UserProfileContext.tsx` — user profile state
- `artifacts/syncareer/src/components/auth/` — ProtectedRoute, AdminRoute, RoleRoute, AuthDialog

## Architecture decisions

- **Clerk auth shim**: `supabase.auth.getSession/getUser/onAuthStateChange/signOut` are monkey-patched in `client.ts` via `setClerkSession()` so all 40+ files using Supabase auth work without individual changes.
- **AuthBridge component**: Lives in App.tsx, syncs Clerk session state into the shim on every render so the supabase client always has a fresh token.
- **Supabase database kept as-is**: Only auth is replaced by Clerk; all DB queries still go through `supabase.from(...)`.
- **AuthDialog redirects**: The old modal auth dialog now redirects to `/sign-in` or `/sign-up` (Clerk-hosted pages) instead of rendering a form.
- **SecuritySection uses Clerk's openUserProfile()**: Password and 2FA management is delegated to Clerk's built-in user profile modal.

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

- Keep Supabase for database and edge functions; only auth is via Clerk
- Maintain Lovable ↔ GitHub ↔ Replit sync

## Gotchas

- `VITE_CLERK_PUBLISHABLE_KEY` and `VITE_CLERK_PROXY_URL` must be set as secrets
- `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` must be set as secrets
- The Clerk proxy is wired at `artifacts/api-server/src/middlewares/clerkProxyMiddleware.ts`
- Vite dev server caches env vars at startup — restart workflow after adding new secrets
- `lib/authCompat.ts` and `lib/clerkAuth.ts` exist but are unused — safe to delete later

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
