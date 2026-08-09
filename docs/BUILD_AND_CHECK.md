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
| **`bun.lock` / `artifacts/syncareer/bun.lock`** | Lovable | `ACTIVE PLATFORM DEPENDENCY` | Used by Lovable sandbox environment and auto-sync. Retained. |
| **`package-lock.json`** | npm / Dependabot | `UNKNOWN` / Compatibility | Maintained for GitHub Dependabot and tooling compatibility. Retained. |

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
- **Status:** **PASS** (36 tests pass across 2 test suites: `useAICoachAccess.test.ts` and `featureAccess.test.ts`).

### 3. Production Build
```bash
# Direct command (exact publisher command)
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts

# Or via root script
corepack pnpm run build
```
- **Status:** **PASS** (Vite builds client production bundles and PWA service worker into `artifacts/syncareer/dist/public` and root `dist`).

### 4. TypeScript Typecheck
```bash
# Direct command
corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit

# Or via root script
corepack pnpm run typecheck
```
- **Status:** **PRE-EXISTING FAILURES DOCUMENTED** (205 errors under strict TypeScript compiler settings).
- **Failure Breakdown:**
  - Strict-null and undefined index access checks (`noUncheckedIndexedAccess`, `strictNullChecks` across legacy UI views and hooks).
  - Outdated or missing Supabase generated types for specific tables/columns (e.g. `counsellor_messages`, `meeting_platform`).
  - Unused imports/declarations (`noUnusedLocals`, `noUnusedParameters`).
- **Policy:** TypeScript settings (`strict: true`, `noImplicitAny: true`, `strictNullChecks: true`, `noEmitOnError: true`) must **never** be weakened. Errors must remain visible and resolved in dedicated type-repair stages.

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

  typecheck-debt-reporting:
    name: Typecheck (Technical Debt Reporting)
    runs-on: ubuntu-latest
    # Temporary non-blocking job to report existing TypeScript errors (~205 errors).
    # REMOVAL CONDITION: Once dedicated type-repair stages eliminate all pre-existing
    # TypeScript errors, remove continue-on-error to make typecheck blocking in main CI.
    continue-on-error: true
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

      - name: Run TypeScript typecheck (Non-blocking technical debt reporting)
        run: corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec tsc -p tsconfig.json --noEmit
```

### CI Job Structure:
1. **`build-and-test` (Blocking):**
   - Runs `pnpm install --frozen-lockfile`.
   - Runs Vitest test suite (`36 passing`).
   - Runs production Vite build.
2. **`typecheck-debt-reporting` (Non-blocking):**
   - Explicitly labeled as temporary technical-debt reporting (`continue-on-error: true`).
   - Runs `tsc -p tsconfig.json --noEmit` and outputs all compiler errors.
   - **Removal/Promotion Condition:** Once dedicated type-repair stages resolve all 205 errors, `continue-on-error` will be removed to enforce typecheck as a blocking CI gate.
