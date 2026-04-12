

# System-Wide Dead Code Removal

## Summary
After auditing every component, hook, utility, and edge function for usage references, three files have zero consumers and should be removed.

## Dead Code Found

### 1. `src/utils/majorContent.ts` (295 lines)
A hardcoded map of major-to-skills/courses/trends data. It was likely superseded by the AI-driven `market-intelligence` edge function and the `careerSkillFramework.ts` utility. No file in the project imports `majorContent`, `getMajorContent`, or `getAllMajors`.

### 2. `supabase/functions/job-digest/index.ts`
A weekly email digest function that fetches new job postings and sends emails via Resend. It is never invoked from the frontend, never scheduled via a cron trigger, and requires a `RESEND_API_KEY` that may not even be configured. Dead deployment cost with no consumer.

### 3. `supabase/functions/process-referral/index.ts`
A function to process referral codes and grant rewards. Never called from any frontend code. The `ReferralCard` component handles referral logic client-side via direct Supabase queries instead.

## What stays (verified active)
Every other file was verified as having at least one active import chain. Specifically checked and confirmed active:
- All hooks (`useOutcomeTracking`, `useFeedbackModal`, `useVoiceInterview`, `useCareerReadiness`, etc.)
- All components (`WhatsAppShareButton`, `ImageCropper`, `FeatureGate`, `ReferralCard`, etc.)
- All remaining edge functions (`admin-users`, `admin-feedback`, `compute-user-intelligence`, `suggest-courses`, `generate-module-quiz`, `interview-tts`, etc.)
- All utilities (`careerSkillFramework`, `countries`, `languages`, `notifications`)

## Changes

| Action | File | Reason |
|--------|------|--------|
| Delete | `src/utils/majorContent.ts` | Zero imports, superseded by AI-driven market intelligence |
| Delete | `supabase/functions/job-digest/index.ts` | Never invoked, no cron schedule |
| Delete | `supabase/functions/process-referral/index.ts` | Never invoked from frontend |
| Edit | `supabase/config.toml` | Remove `[functions.process-referral]` and `[functions.job-digest]` blocks |

Total lines removed: ~500. No functional impact.

