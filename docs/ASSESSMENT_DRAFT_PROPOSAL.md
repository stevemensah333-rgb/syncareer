# Assessment save/resume proposal

The current assessment stores only completed `assessments` and their `assessment_responses`. It has no authenticated draft table, RLS policy, expiry policy or guest-to-account claim flow. Browser storage is not added because answers can be personal and an unscoped shared-device draft could be exposed to another user.

If completion/abandonment evidence justifies resume support, use the smallest explicit design:

1. Add an owned `assessment_drafts` row with `user_id`, validated answer JSON, current page, created/updated timestamps and an expiry timestamp.
2. Enforce one active draft per user, owner-only RLS, allowed question IDs and Likert values 1–5.
3. Upsert at page boundaries rather than on every radio change.
4. Show the stored timestamp and an explicit Resume / Start over choice.
5. Delete the draft transactionally after successful assessment and response insertion.
6. Expire abandoned drafts after a documented short retention period.
7. Keep guest progress in memory only unless a separate, explicit on-device storage consent is designed.
8. Emit `assessment_resumed` only after a real stored draft is loaded; never infer resume from opening the route.

This requires a migration, RLS tests, rollback SQL and separate approval. Until then the UI states honestly that refresh/navigation clears unfinished answers.
