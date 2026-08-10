# Build and Check Runbook

## Current Architecture & Scope

- **Frontend Application:** Located at `artifacts/syncareer/` (React 19, TypeScript 5.9, Vite 7, Tailwind CSS).
- **Backend Architecture:** Supabase Auth, Postgres/PostgREST/RLS, database triggers/functions, and Supabase Edge Functions in `supabase/functions/`.
- **Note on Historical Docs:** Stale documentation (such as `replit.md` or `docs/archive/`) referenced an Express API server (`artifacts/api-server/`) or employer dashboards. No Express server exists; the current operating application relies on Supabase.

---

## Package Manager & Platform Classifications

| Tool / File | Scope / Platform | Classification | Authority Status |
|---|---|---|---|
| **`pnpm` / `pnpm-lock.yaml` / `pnpm-workspace.yaml`** | Local dev, CI, Replit, Publisher | `ACTIVE PLATFORM DEPENDENCY` | **Authoritative** package manager for local development, CI pipelines, and production builds. |
| **`bun.lock` / `artifacts/syncareer/bun.lock`** | Lovable | `ACTIVE PLATFORM DEPENDENCY` | Used by the Lovable sandbox environment and auto-sync. Package URLs resolve through Lovable's private npm proxy (`europe-west4-npm.pkg.dev/lovable-core-prod/sandbox-npm-cache`), so these files must be edited surgically and never regenerated against the public registry. Retained. |
| **`package-lock.json`** | npm | *Removed* | Removed during platform cleanup. There is no `.github/` directory, no Dependabot/Renovate configuration, and no npm-based script or platform consumer. npm also does not read `pnpm-workspace.yaml`, so `npm ci` only ever installed the four root dependencies and never the actual app in `artifacts/syncareer` — a misleading, non-reproducible install. |

---

## Verification Commands & Baseline Status

All commands are executed from the repository root.

### 1. Clean Frozen Installation (Authoritative)
```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile
```
- **Status:** **PASS** (Zero dependency drift, 408 lockfile entries verified, fully reproducible).

### 2. Unit Tests
```bash
# Direct command
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run

# Or via root script
corepack pnpm run test
```
- **Status:** **PASS** (99 tests pass across 11 test suites). The suite covers deterministic
  domain logic (RIASEC scoring, CV strength, feature access, progress, subscription gating),
  auth/onboarding validation + the Lovable Google OAuth session-handoff boundary, and
  email sign-up/sign-in contracts. See [`docs/TEST_MATRIX.md`](./TEST_MATRIX.md) for what each
  layer protects. Database/RLS and edge-function contract layers are runnable scripts that
  require an isolated Supabase/Deno environment and are not part of this local suite.

### 3. Production Build
```bash
# Direct command (exact publisher command)
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts

# Or via root script
corepack pnpm run build
```
- **Status:** **PASS** (Vite builds client production bundles into `artifacts/syncareer/dist/public` and copies `public/` into root `dist`. Note: there is no offline PWA; `public/sw.js` is decommission logic that unregisters legacy service workers and clears caches.)

### 4. TypeScript Typecheck
```bash
# Direct command
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit

# Or via root script
corepack pnpm run typecheck
```
- **Status:** **PASS** (0 errors under strict TypeScript compiler settings).
- **Policy:** TypeScript settings (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noEmitOnError: true`, `noUncheckedIndexedAccess`) must **never** be weakened. The historical 205-error debt described in [`archive/TYPECHECK_TRACKING.md`](./archive/TYPECHECK_TRACKING.md) has been resolved; that file is archived for history.

---

## Continuous Integration (GitHub Actions)

Recommended workflow configuration for `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: ["**"]
  pull_request:
    branches: ["**"]

jobs:
  build-and-test:
    name: Build & Test
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies (frozen lockfile)
        run: corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile

      - name: Run Vitest tests
        run: corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vitest run

      - name: Production Build
        run: corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts

  typecheck:
    name: Typecheck
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 24

      - name: Enable Corepack
        run: corepack enable

      - name: Install dependencies (frozen lockfile)
        run: corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile

      - name: Run TypeScript typecheck
        run: corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit
```

### CI Job Structure:
1. **`build-and-test` (Blocking):**
   - Runs `pnpm install --frozen-lockfile`.
   - Runs Vitest test suite (`99 passing`) — the local/stable test layer.
   - Runs production Vite build.
2. **`typecheck` (Blocking):**
   - Runs `tsc -p tsconfig.json --noEmit` and gates on zero errors (now passing).
   - Note: this `ci.yml` is a recommended configuration. No `.github/workflows/` file is
     committed in this repository and none should be added without the platform owner's
     approval (the CI contract is currently the root `pnpm test` / `pnpm typecheck` scripts).
