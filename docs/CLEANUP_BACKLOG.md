# Cleanup backlog

Purpose: keep the codebase auditable for a human maintainer. This file records what
has been removed and what is deliberately left, so no one re-derives the analysis.

## How to re-run the audit

```bash
cd artifacts/syncareer
pnpm dlx knip@5 --no-exit-code --reporter symbols
```

Then verify from the repo root:

```bash
corepack pnpm install --config.verify-deps-before-run=false --frozen-lockfile
corepack pnpm run typecheck
corepack pnpm run test
corepack pnpm run build
```

## Removed (2026-09-08)

Unreachable application code — no import anywhere in `src/` or the visual fixtures:

- `src/App.css`
- `src/components/ai-coach/` (CareerInsightsPanel, ChatMessage, QuickActions, TypingIndicator) —
  the AI Coach page never imported them.
- `src/components/auth/SignupWizard.tsx` (superseded by the current signup forms)
- `src/components/cv-builder/CVSkillGapPanel.tsx`
- `src/components/dashboard/ProgressDisplay.tsx`, `UniversityInsightsCard.tsx`
- `src/components/profile/ImageCropper.tsx`, `src/components/shared/WhatsAppShareButton.tsx`
- `src/features/assessment/jobMatcher.ts`, `src/features/counsellor/constants.ts`,
  `src/features/interview/reportParser.ts`
- `src/hooks/useCareerReadiness.ts`, `useNextBestAction.ts`, `useOutcomeTracking.ts`, `useUserContext.ts`
- `src/lib/apiClient.ts`, `src/lib/errorHandling.ts`, `src/utils/careerSkillFramework.ts`
- Unused shadcn primitives: aspect-ratio, button-group, calendar, carousel, chart, command,
  context-menu, drawer, empty, field, form, input-group, input-otp, item, kbd, menubar,
  navigation-menu, pagination, resizable, separator, slider, toggle, toggle-group.

Dependencies dropped with them: the matching `@radix-ui/*` packages, `cmdk`,
`embla-carousel-react`, `input-otp`, `react-day-picker`, `react-image-crop`,
`react-resizable-panels`, `vaul`, `@tailwindcss/typography`, `react-hook-form`.

Two design-system tests asserted on deleted primitives (`drawer.tsx`, `toggle.tsx`);
those assertions were removed, not weakened. Suite: 650 passing.

## Deliberately kept (not dead code)

- `artifacts/syncareer/public/sw.js` — a tombstone service worker. Offline support was
  removed, but browsers that installed the old worker only drop it once a fetch of this
  path succeeds. Deleting it strands those clients on stale cached assets.
- `visual-fixtures/` and `src/visual-fixtures/` — a development review harness guarded by
  `visualFixtureIsolation.test.ts`, which asserts it never reaches the production entry.
- `src/` at the repository root — Lovable's auto-sync target for generated Supabase files,
  not a build input. Do not prune it by hand.

## Known, low-priority

Knip still reports ~93 unused exports and ~110 unused exported types. Most are React prop
interfaces and constants exported for readability or for tests. Removing the `export`
keyword across them is broad churn with no runtime benefit, so it is not scheduled. If you
want a stricter rule, enforce it per-directory rather than repo-wide.
