# Publishing Troubleshooting

## Symptom
```
build failed with exit status 1: $ corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts
error: script "build" exited with code 1
```
And/or dev server log:
```
[ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL] Command "vite" not found
```

## Root cause
The workspace `node_modules` (and the `vite` bin shim under `artifacts/syncareer/node_modules/.bin/vite`) was missing in the publish/preview sandbox. `pnpm exec vite` had nothing to resolve, so both the production build and the dev-server daemon kept exiting with code 1.

This was triggered by recent edits that left the lockfile / workspace in a state where the install step did not complete successfully on the publish runner — the `pnpm-workspace.yaml` `allowBuilds` placeholders that were already corrected in a previous fix had broken the install, leaving an empty `node_modules`. Once install fails, every subsequent `pnpm --dir … exec vite …` invocation reports "Command vite not found".

## Fix applied
1. Updated the root `build`, `build:dev`, `dev`, `test`, and `typecheck` scripts to run `corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile` before invoking package-local binaries from `artifacts/syncareer`.
2. Re-ran the install from the repo root so all workspace packages (including `artifacts/syncareer`) repopulated their `node_modules` and bin shims.
3. Verified the exact production publish command succeeds:
   ```
   corepack pnpm --config.verify-deps-before-run=false --dir artifacts/syncareer exec vite build --config vite.config.ts
   ```
   Result: `✓ built in 15.86s`, PWA service worker generated, output in `artifacts/syncareer/dist/public`.
4. Simulated a clean publish runner by copying the repo without `node_modules`, running a frozen lockfile install, then running the same Vite production build. The clean simulation succeeded.
5. Restarted the Vite dev server. It came up healthy on `http://localhost:8080/` (`VITE v7.3.2 ready in 587 ms`).

## Verification commands
```bash
# Install (must succeed before anything else)
corepack pnpm install --config.verify-deps-before-run=false

# Production build (this is the exact command the publisher runs)
corepack pnpm --config.verify-deps-before-run=false \
  --dir artifacts/syncareer exec vite build --config vite.config.ts

# Dev build
corepack pnpm --config.verify-deps-before-run=false \
  --dir artifacts/syncareer exec vite build --config vite.config.ts --mode development
```

## How to avoid regressions
- Do not put placeholder strings (e.g. `set this to true or false`) in `pnpm-workspace.yaml` `allowBuilds`. Use real booleans only.
- Do not introduce `catalog:` or `workspace:*` specifiers into `artifacts/syncareer/package.json` — that file must stay standalone-publishable with explicit version strings.
- The publish artifact requires the managed env vars `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and `VITE_SUPABASE_PROJECT_ID`. They are provided by Lovable Cloud automatically; do not add `.env` to `.gitignore` overrides that strip them.
- If publishing fails again with `Command "vite" not found`, the first action is always: re-run the install command above and re-check `artifacts/syncareer/node_modules/.bin/vite` exists.
