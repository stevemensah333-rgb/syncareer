# Mentor request service

Syncareer owns mentor discovery, company-email verification, request consent, lifecycle state and the introduction. Scheduling and continued conversation happen through normal email after acceptance.

## Trust and privacy boundaries

- `career_counsellor` remains the internal account role; the product calls it “Career mentor”.
- Email confirmation proves control of the organization address. An admin must still approve the domain/company claim.
- Only approved mentors with `accepting` or `limited` capacity appear in `mentor_profiles_public`.
- Pending requests do not reveal either participant's email or the selected CV contents.
- Acceptance unlocks the selected CV for that mentor and queues separate introduction emails to both parties.
- Browser clients cannot directly insert or update request, verification, or email-outbox rows.

## Operations

Apply `20260831120000_mentor_request_service.sql`, deploy `process-mentorship-email-outbox`, deploy the updated transactional email registry, then regenerate Supabase types through Lovable and synchronize both tracked copies with `pnpm schema:types:sync --confirm-lovable-regenerated`.

The outbox is drained event-driven: an insert trigger invokes `process-mentorship-email-outbox` using the existing `email_queue_service_role_key` vault secret. There is no recurring polling job. Failed outbox entries remain retryable; invoke `process-mentorship-email-outbox` with a service-role JWT to retry them. Monitor `mentorship_email_outbox`, the existing transactional queue, and `email_send_log`.

Legacy booking, availability, session, message, credential and review tables are preserved for recovery. Their application routes redirect to the mentor service. Delete those tables only in a later approved migration after confirming zero live dependencies.

Rollback instructions are in `supabase/rollback/mentor_request_service_rollback.sql`. The rollback is safe only before production mentorship requests exist.
