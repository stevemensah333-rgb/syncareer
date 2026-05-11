
# Full System Verification & Cleanup Plan

## Goal
Verify Syncareer end-to-end (build → sign up → role routing → onboarding → each feature page) and remove only clearly unused/redundant code. Do not modify working code.

## Phase 1 — Build & Static Verification
1. Run production build (`corepack pnpm --filter @workspace/syncareer exec vite build`) and capture errors.
2. Run typecheck on `artifacts/syncareer` and resolve only blocking type errors.
3. Check dev-server logs for runtime warnings.

## Phase 2 — Auth & Onboarding Flow Audit
Trace the full path:
- `Landing.tsx` → `AuthDialog` → `lib/auth.tsx` (sign in / sign up / Google OAuth)
- `ProtectedRoute` → `UserProfileContext` (profile fetch, loading, defensive timeouts)
- `RoleRoute` → only `student` and `career_counsellor` remain (employer purged)
- `Onboarding.tsx` → role selection writes correct `user_type` and `onboarding_completed`
- Confirm DB: `profiles` table allows only the two roles; `handle_new_user` trigger still works; `user_roles` defaults are sane (currently inserts `job_seeker` — flag if mismatched).

## Phase 3 — Role-Specific Route Audit
For each role, load every route in `App.tsx` and verify the page mounts without errors:

Student routes:
- `/dashboard`, `/learn`, `/opportunities`, `/portfolio`, `/analysis`, `/ai-coach`, `/interview-simulator`, `/applications`, `/cv-builder`, `/assessment`, `/settings`, `/pricing`

Counsellor routes:
- `/counsellor-dashboard`, `/counsellor-availability`, `/counsellor-sessions`, `/counsellor-clients`, `/counsellor/complete-credentials`

Admin routes:
- `/admin/feedback`, `/admin/users`, `/admin/credentials`

Public routes:
- `/`, `/sign-in`, `/sign-up`, `/reset-password`, `/portfolio/:userId`, `/terms`, `/signed-out`, `/subscription-success`

For each, check:
- No imports of removed employer files/components
- No references to `employer` user_type, `/employer/*` paths, `PostJob`, `MyCompany`, `HireWithAI`, `ApplicantTracker`
- Page renders against current Supabase schema

## Phase 4 — Backend Sanity
- Run Supabase linter for security/RLS issues.
- Verify required edge functions deploy (no broken imports referencing employer).
- Confirm secrets present (already listed: Lovable AI, Resend, Paystack, etc.).
- Note: DB still contains `job_postings.employer_id`, `job_applications`, employer-related RLS — kept because external job postings + student applications still depend on them. Will not remove.

## Phase 5 — Dead Code Removal (Conservative)
Only delete items confirmed unreferenced by `rg`:
- `.migration-backup/` — old pre-workspace snapshot, safe to drop if nothing imports from it.
- `.migration-backup/src/pages/employer/*` — already orphaned.
- Any leftover employer page files in `artifacts/syncareer/src/pages/employer/` (if present).
- Unused employer-only components (`EmployerSidebar`, employer nav items, etc.) if `rg` shows zero imports.
- Unused i18n keys for employer (only if every locale references them and no component does).
- `lib/db/`, `lib/api-client-react/`, `lib/api-zod/`, `lib/api-spec/`, `artifacts/api-server/` — verify they're not part of the active build pipeline; if truly orphaned from the syncareer artifact, flag (won't delete without confirmation since they may be intentional scaffolding).

Rule: if `rg` shows ANY runtime import, leave it alone.

## Phase 6 — Smoke Test in Preview
Use browser tool to:
1. Load `/` → open sign-up dialog.
2. Sign up a test student → verify redirect to `/onboarding` → complete → land on `/dashboard`.
3. Repeat for counsellor → land on `/counsellor-dashboard`.
4. Visit each role's pages, capture console errors.
5. Sign out → `/signed-out`.

## Deliverable
A short report listing:
- Build status
- Routes verified working / broken (with fix applied)
- Files removed (with reason)
- Items flagged for user decision (e.g. unused `lib/*` workspaces)
- Any DB/RLS concerns

## Technical Notes
- Stay inside `artifacts/syncareer` for app code; touch root only for script/lockfile fixes if a build error blocks verification.
- No schema migrations unless a broken page requires one — will surface as a question first.
- No new features. Cleanup is delete-only, not refactor.
