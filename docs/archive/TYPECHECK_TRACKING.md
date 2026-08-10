# TypeScript Error Tracking Summary (ARCHIVED)

> **Archived / non-authoritative.** This tracked a historical 205-error typecheck
> baseline that has since been resolved (`tsc --noEmit` reports 0 errors). It is
> retained only as a record of what was repaired. The current build/verification
> contract is [`../BUILD_AND_CHECK.md`](../BUILD_AND_CHECK.md).

**Baseline:** 205 errors across 57 files  
**Generated types:** `artifacts/syncareer/src/integrations/supabase/types.ts` (verified schema)

---

## Category 1: Generated-schema & database-reference mismatches (56 errors)

| Domain | Files | Count | Root Cause |
|--------|-------|-------|------------|
| Counsellor credentials | `lib/credentialApi.ts` | 31 | `counsellor_credentials` table missing from generated types; code queries a nonexistent table |
| Counsellor messages | `lib/messagingApi.ts`, `hooks/useSessionMessages.ts`, `components/counsellor/SessionMessaging.tsx` | 10 | `counsellor_messages` table missing from generated types |
| Meeting platform | `components/counsellor/MeetingLinkDisplay.tsx`, `MeetingLinkManager.tsx` | 5 | `meeting_platform` column doesn't exist on `counsellor_details` in generated types |
| Session messaging props | `components/counsellor/SessionsManager.tsx` | 1 | Passing `counsellorId` to `SessionMessaging` which expects `clientName` |
| Referral RPC | `components/referral/ReferralCard.tsx` | 2 | `get_my_referral_code` RPC missing from generated Functions |
| Subscription limits | `components/subscription/SubscriptionManager.tsx`, `hooks/useSubscription.ts`, `pages/AICoach.tsx` | 7 | `FREE_LIMITS[key]` typed as possibly-undefined due to `Record<string, ...>` index |

## Category 2: Runtime correctness errors (76 errors)

| Domain | Files | Count | Root Cause |
|--------|-------|-------|------------|
| Zod parseSync | `components/auth/SignupWizard.tsx` | 3 | `parseSync` removed in Zod v4; use `parse` |
| Array/object indexing | `pages/assessment/assessmentConstants.ts` | 10 | `noUncheckedIndexedAccess` makes indexed values `T \| undefined` |
| Array/object indexing | `hooks/useAssessment.ts` | 7 | Same — indexed `answers[q.id]`, `riasecScores[key]` |
| CV strength scoring | `hooks/useCVStrengthScore.ts` | 8 | Accessing `.score` on possibly-undefined detail entries |
| Voice interview round | `components/interview/VoiceInterviewMode.tsx` | 11 | `ROUND_LABELS[round]` is `T \| undefined`; round/question indexing |
| Tab indexing | `components/landing/TabbedShowcase.tsx` | 14 | `TABS[active]` is `T \| undefined` |
| Promise.allSettled | `hooks/useUserContext.ts` | 4 | Accessing `.value` on rejected results; `.data` possibly undefined |
| Career score indexing | `hooks/useCareerRecommendations.ts` | 4 | `riasecScores[key]` possibly undefined |
| Form/prop mismatches | `components/auth/SignupWizard.tsx`, `pages/Dashboard.tsx`, various | 8 | `FormStep \| undefined`, `string \| undefined` passed to strict params |
| Validation | `lib/validationSchemas.ts` | 1 | `error.issues[0]` possibly undefined |
| API client return | `lib/apiClient.ts` | 1 | Loop lacks ending return when `maxRetries > 0` |
| Object possibly undefined | `pages/Markets.tsx`, `Settings.tsx`, `ApplicationTracker.tsx`, `Onboarding.tsx`, `FeedbackDashboard.tsx`, `components/analysis/MarketOverviewTab.tsx`, `components/counsellor/AskCounsellorDialog.tsx`, `components/cv-builder/CVAIAssistant.tsx`, `components/settings/ProfileSection.tsx` | 15 | Various `[0]` or property access on possibly-undefined values |

## Category 3: Library/API compatibility (6 errors)

| Domain | Files | Count | Root Cause |
|--------|-------|-------|------------|
| input-otp slots | `components/ui/input-otp.tsx` | 3 | `slots[index]` possibly undefined from `input-otp` context |
| Chart payload | `components/ui/chart.tsx` | 2 | `item` in `payload.map` possibly undefined |
| Calendar rest | `components/ui/calendar.tsx` | 1 | Unused destructured `rest` |
| SEO Element | `lib/seo.ts` | 2 | `Element` type lacks `.rel` and `.href`; need `HTMLLinkElement` |

## Category 4: Unused imports/variables (64 errors)

61 TS6133 + 3 TS6196 + 2 TS6192 = 64 unused declarations across ~35 files. All are dead imports or declared-but-never-used variables.

---

## Repair Order

1. **Schema mismatches** — add missing tables/RPC to generated types where code is confirmed correct
2. **Runtime correctness** — guard indexing, replace `parseSync`, fix Promise.allSettled handling
3. **Library compatibility** — narrow types for input-otp, chart, seo
4. **Unused imports** — bulk cleanup
