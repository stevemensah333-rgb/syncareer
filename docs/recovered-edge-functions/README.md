# Recovered Edge Function sources (reference only)

These eight Edge Functions are **live in the Lovable Cloud project but have no tracked
source under `supabase/functions/`**. The app calls all of them:

| Function | Called from |
|---|---|
| `admin-feedback` | admin feedback dashboard |
| `admin-users` | admin user management |
| `analyze-portfolio` | `src/hooks/useCVAnalysis.ts` (CV analysis) |
| `check-feature-access` | server-side quota checks |
| `compute-user-intelligence` | CV editor, assessment completion |
| `delete-account` | Settings → Account & Security |
| `mock-interview` | interview simulator |
| `send-notification` | notification delivery |

## Provenance and staleness warning

The files here were recovered from the `.migration-backup/` snapshot that was deleted in
commit `3b8f74d` (2026-05-11). They are the only source in this repository for these
functions. They are **not verified to match what is currently deployed** — the same
snapshot contains older copies of `career-guidance` and `market-intelligence`, which have
since been rewritten, so assume drift.

They deliberately live outside `supabase/functions/` so that a build does **not** redeploy
them and overwrite the live versions.

## Promoting a function to tracked source

Do this one function at a time:

1. Read the recovered file and compare it against current call sites and the database
   schema/RLS it depends on.
2. Update it until it matches intended current behaviour.
3. Move it to `supabase/functions/<name>/index.ts`.
4. Deploy only that function and re-run its call path against a real account before moving
   on to the next.

Delete a directory here once its function has been promoted.

## `legacy/` — live but uncalled

`legacy/` holds recovered source for seven functions that are still deployed but have no
caller in the app, in tracked Edge Functions, or in database functions:

`generate-module-quiz`, `suggest-courses`, `suggest-free-resources` (learning module,
retired), `verify-paystack-payment` (paid model, removed), `cv-ai-assistant`,
`talent-recommend` (employer sourcing, never shipped), `compute-university-insights`
(table dropped).

Source is kept here so deleting the deployed functions is reversible. Same staleness
warning applies.

Still live and in use, so not listed here: `interview-tts`
(`src/hooks/useVoiceInterview.ts`) and `auth-email-hook` (wired into Supabase Auth).
