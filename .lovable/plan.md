## Goal
Make the Syncareer web artifact publish reliably again, then document the root cause and verification steps.

## Findings
- The publish/dev command is failing before Vite can run: `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vite" not found`.
- The sandbox currently has no `node_modules` or `vite` binary installed, so the artifact build command cannot resolve `vite`.
- The publish artifact has already been partly made standalone-safe, but the workspace still contains dependency formats and config that can reintroduce install/build failures:
  - `catalog:` and `workspace:*` still exist in other workspace packages and the lockfile.
  - The web artifact still depends on Replit-only dev plugins during non-production mode.
  - The web artifact relies on managed `VITE_SUPABASE_*` environment values during build/runtime, so this must stay documented as a publish prerequisite.

## Repair plan
1. **Reproduce the exact failure signal**
   - Run the exact web publish command after dependency installation so the real production error is visible, not just the missing `vite` symptom.
   - Also check the dev-server health command because publishing and preview use the same web artifact tooling.

2. **Stabilize dependency installation**
   - Ensure workspace dependency configuration cannot block `pnpm install` or prevent bin shims like `vite` from being generated.
   - Remove or replace any publish-breaking placeholder/specifier patterns that affect the web artifact install path.
   - Keep changes minimal and avoid touching unrelated app features.

3. **Harden the web artifact build config**
   - Make `artifacts/syncareer/vite.config.ts` production-safe and dev-safe.
   - Avoid loading Replit-only diagnostic plugins unless the environment can actually support them.
   - Keep PWA output valid and verify required public assets exist.

4. **Run verification**
   - Install dependencies if needed.
   - Run the exact production publish build command:
     `corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts`
   - Run the development build command:
     `corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts --mode development`
   - Start/verify the dev server health path after the fix.

5. **Document the failure and fix**
   - Add a short publishing troubleshooting note to the project docs explaining:
     - root cause,
     - changed files,
     - exact verification commands,
     - how to avoid reintroducing `catalog:`/workspace install issues in the standalone publish artifact,
     - managed environment variable prerequisites.

## Files likely to change
- `pnpm-workspace.yaml`
- `artifacts/syncareer/vite.config.ts`
- potentially `artifacts/syncareer/package.json` if dependency placement needs adjustment
- a documentation file such as `ERROR_REPORT.md` or a new publish troubleshooting note

## Success criteria
- Exact production publish command exits successfully.
- Dev build exits successfully.
- Dev server becomes healthy.
- Documentation records what broke publishing and how it was verified.