# Cleanup Backlog — Risks, Impact, and Fix Plans

Last updated: 2026-05-12
Status: **All items below are deferred.** Only the safe Assessment.tsx constants extraction has been executed.

This document catalogs technical debt ("AI slop") found during the full system audit. Each item lists what it affects, why it's risky to touch, and the safest path to resolution if/when we decide to act.

---

## 1. Duplicate `types.ts` (Supabase generated types)

### What it is
- `src/integrations/supabase/types.ts` (auto-managed by Lovable, 2,260 lines)
- `artifacts/syncareer/src/integrations/supabase/types.ts` (manual copy, 2,260 lines)

The actual app builds from `artifacts/syncareer/src` (per `tsconfig.json` `include: ["src/**/*"]` and `paths: { "@/*": ["./src/*"] }`). The root `/src` copy exists because Lovable's auto-sync writes there, but the app can't reach it.

### What it affects
- **Type safety only.** No runtime impact, no bundle impact (types are stripped at compile time).
- Whenever the database schema changes, Lovable updates `/src/integrations/supabase/types.ts`. The artifacts copy goes stale and silently produces wrong autocomplete/type errors until someone notices.

### Risks of fixing
- **High.** Any of the three obvious fixes has a failure mode:
  1. **Re-export shim** (`export * from "../../../../../../src/integrations/supabase/types"`) — fragile relative path; on the next auto-sync Lovable may overwrite our shim with a fresh full types dump, undoing the fix.
  2. **Symlink** — Lovable's file writer doesn't preserve symlinks; same overwrite risk.
  3. **tsconfig path alias** pointing `@/integrations/supabase/types` to the root copy — would work, but `customConditions: ["workspace"]` and the bundler-mode resolution may not honor a path that escapes the `include` glob; needs verification, and Vite must agree.

### Safest fix (if attempted)
1. Try the path-alias approach first in a throwaway branch.
2. Verify both `tsc --noEmit` and `vite build` succeed.
3. Verify the alias survives a manual schema change + regenerate cycle.
4. Only then delete the artifacts copy.

### Recommendation
**Leave it.** Cost of mistake (silent type drift causing real runtime bugs that look unrelated) is higher than the maintenance pain. Whenever we change schema, we manually re-copy — it's a 2-second operation and we already have the muscle memory.

---

## 2. 11 edge functions deployed but missing from the repo

### What it is
The frontend invokes 14 edge functions; only 3 exist in `supabase/functions/`:

**Present locally:** `alumni-outcomes`, `market-intelligence`, `aggregate-external-jobs`

**Deployed only (no local source):**
- `career-guidance` — SynAI chat backbone
- `mock-interview` — Interview Simulator scoring
- `cv-ai-assistant` — CV Builder AI suggestions
- `compute-user-intelligence` — Readiness Score computation
- `compute-university-insights` — University Insights cache
- `analyze-portfolio` — Portfolio AI analysis
- `check-feature-access` — Subscription gating
- `generate-module-quiz` — Learn module quizzes
- `suggest-courses` — Course recommendations
- `suggest-free-resources` — Free resource recommendations
- `send-notification` — Resend email dispatch
- `delete-account` — Service-role account deletion
- `admin-feedback`, `admin-users` — Admin dashboard data

### What it affects
- **Maintainability.** We cannot review, version, or modify these functions from the codebase. If one breaks or its third-party API changes, we can only patch it through the Supabase dashboard, which loses the change on the next Lovable deploy.
- **Audit trail.** No git history for half the backend.
- **Onboarding.** A new contributor reading the repo would not know these functions exist.

### Risks of fixing
- **Critical.** Two failure modes:
  1. **Reverse-engineering the implementation** from how the frontend calls each function would almost certainly diverge from the live behavior. Scoring formulas, prompt templates, caching keys, and error shapes are invisible from the call site. A wrong reimplementation would silently degrade the AI Coach, Interview Simulator, CV Assistant, and Readiness Score in subtle ways users would blame on "the AI being worse."
  2. **A redeploy from a wrong local version** would overwrite the working production function. There is no rollback to the deployed-only state because we never had the source.

### Safest fix (if attempted)
- We need the **actual deployed source**. Two options:
  1. **Pull from Supabase** via `supabase functions download <name>` (requires CLI auth and project access from the user's machine, not from this sandbox).
  2. **Ask the user to paste each function's source** from the Supabase dashboard one at a time.
- For each function pulled:
  1. Save verbatim to `supabase/functions/<name>/index.ts`.
  2. **Do not modify.** Just commit it so it's visible.
  3. Mark with a header comment: `// Pulled from production YYYY-MM-DD — do not modify without redeploying.`
- Only after all 11 are pulled and committed should anyone consider edits, and edits should ship one function at a time with edge function logs monitored after each deploy.

### Recommendation
**Worth doing**, but only the user can drive step 1 (we cannot reach the deployed code from here). Until then, treat these functions as a black box.

---

## 3. Page files are too large

### What it is
Files over 500 lines mixing data fetching, business logic, form state, and rendering:

| File | Lines |
|---|---|
| `Assessment.tsx` | ~684 (was 765, now reduced) |
| `Onboarding.tsx` | 650 |
| `InterviewSimulator.tsx` | 597 |
| `CVBuilder.tsx` | 585 |
| `counsellor/CounsellorDashboard.tsx` | 564 |
| `Settings.tsx` | 547 |
| `Markets.tsx` | 535 |
| `ApplicationTracker.tsx` | 523 |

### What it affects
- **Maintainability.** Every change risks merge conflicts and unintended side effects because everything lives in one closure.
- **Re-render cost.** A single state change re-renders the entire page tree. Splitting allows React to skip stable subtrees. Real-world impact is small but non-zero on slower devices.
- **Bundle splitting.** Vite already code-splits per route, but a 600-line page is still a 600-line chunk.

### Risks of fixing
- **Low to medium**, dependent on technique:
  - **Extracting pure constants/helpers** (what we did with `Assessment.tsx`): essentially zero risk.
  - **Extracting sub-components**: low risk if props are passed explicitly. Risk grows if we accidentally close over different state via shared hooks.
  - **Extracting custom hooks**: medium risk. Can change render order or trigger different data-fetch timings if dependencies shift.

### Safest fix (when attempted)
Per file, in order of escalating risk:
1. Move pure data, types, and pure functions to a sibling `<page>/` folder (done for Assessment).
2. Extract leaf JSX blocks that take simple props (e.g. `<QuestionCard>`, `<SectionIntro>`) — no shared state.
3. Extract container sub-components only after #1 and #2 are stable.
4. **Never** combine refactor + behavior change in the same commit.
5. After each file, manually click through the page in preview before moving on.

### Recommendation
**Do this incrementally** — one page per session, only when we're already in that file for another reason. Don't do a refactor sweep.

---

## 4. Overlapping readiness/score hooks

### What it is
Six custom hooks that all touch user career signal data:
- `useCareerReadiness` — Career Readiness ring on Dashboard
- `useCareerRecommendations` — Career suggestions on Assessment / Dashboard
- `useNextBestAction` — "Getting Started" checklist
- `useUserContext` — SynAI context payload
- `useCVStrengthScore` — CV strength score in CV Builder
- `useCVAnalysis` — CV analysis section

### What it affects
- **Performance.** Likely 3–6 redundant Supabase round-trips on the Dashboard alone (each hook independently queries `profiles`, `assessment_results`, `resumes`, etc.).
- **Consistency.** Two hooks computing "readiness" from slightly different inputs can produce different numbers shown in different places, which users notice and report as bugs.
- **Cognitive load.** A new contributor has to read all six to understand which one to call.

### Risks of fixing
- **Medium.** Hidden behavioral differences:
  - Different cache keys → different staleness behavior
  - Different trigger conditions (some refetch on `auth` change, some don't)
  - Different fallback values when data is missing
  - SynAI's `useUserContext` likely has a richer payload than the Dashboard hooks need
- Merging blindly could shift what the Dashboard ring shows, when SynAI recomputes context, or whether the "Getting Started" checklist updates after onboarding.

### Safest fix (when attempted)
1. **Document the current behavior** of each hook first: inputs, outputs, refetch triggers, cache TTL, fallback values. Without this, any merge is guesswork.
2. **Build a comparison harness** — a hidden debug page that renders all six hooks side-by-side for the logged-in user, so we can see numerical drift before and after.
3. **Identify the canonical source** — likely `useUserContext` since it powers SynAI and probably has the most complete payload.
4. **Migrate consumers one at a time**, starting with the lowest-stakes (e.g. "Getting Started" checklist) and ending with the Dashboard ring.
5. **Keep deprecated hooks as thin re-exports** for one release before deleting, so nothing breaks if a consumer is missed.

### Recommendation
**Defer until we hit a real bug** caused by the inconsistency, or until we add a feature that needs a unified score (e.g. weekly progress emails). Refactoring this without a forcing function is high effort, medium risk, low user-visible reward.

---

## 5. ~150 strict-null TypeScript warnings (pre-existing)

### What it is
Older files use `value?.foo?.bar` chains and implicit `any` returns. They compile (because `noEmitOnError` allows warnings), but type safety is degraded.

### What it affects
- **Future bug surface.** Each `?.` is a place where `undefined` could flow downstream and crash at runtime instead of being caught by the compiler.

### Risks of fixing
- **Low per file, high in aggregate.** Each fix is mechanical. The risk is volume: 150 small edits across many files, each one a chance for a typo.

### Recommendation
**Fix opportunistically** — whenever we're already editing a file, clean up its strict-null warnings. Do not do a sweep.

---

## Summary table

| # | Item | Functionality risk | Performance risk | Recommended action |
|---|---|---|---|---|
| 1 | Duplicate `types.ts` | None | None | **Leave it.** Manual re-copy on schema change. |
| 2 | Missing edge function source | High if reimplemented wrong | None | **Pull verbatim** when user can access dashboard. |
| 3 | Fat page files | Low–medium | Tiny win | **Incremental**, opportunistic. |
| 4 | Overlapping hooks | Medium | Real win | **Defer** until forced by a feature/bug. |
| 5 | Strict-null warnings | Low | None | **Opportunistic**, while editing. |

---

## Done so far
- ✅ `Assessment.tsx`: extracted pure constants and `calculateScoresLocally` to `src/pages/assessment/assessmentConstants.ts`. File: 765 → 684 lines. No logic change.
