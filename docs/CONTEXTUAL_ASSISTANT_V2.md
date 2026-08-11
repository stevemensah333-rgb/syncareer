# Contextual assistant v2 handoff

## Status

The frontend sends a versioned request to the existing authenticated `career-guidance` URL and fails closed unless it receives the validated v2 response below. The tracked Edge Function still implements the legacy streaming contract. It was deliberately not edited or deployed because the exact deployed `check-feature-access` implementation and its transactional semantics are unavailable in the repository.

Lovable classifications:

- Supabase Auth/client/function boundary: **ACTIVE PLATFORM DEPENDENCY**.
- Lovable AI gateway and `LOVABLE_API_KEY`: **USEFUL INTEGRATION**.
- `career-guidance`: **USEFUL INTEGRATION**; retain the legacy branch while bookmarks/older clients transition.
- deployed-only `check-feature-access`: **UNKNOWN** until exact source and quota transaction behavior are recovered; do not remove or bypass it.
- unused legacy `components/ai-coach/*`: **HISTORICAL COMPATIBILITY** for the transition period. Remove only after v2 deployment, usage review and explicit approval.
- PostHog helpers: **UNKNOWN** live status. Contextual-assistant events are intentionally not emitted before consent rules are approved.

## Request

`POST /functions/v1/career-guidance`

```json
{
  "version": 2,
  "requestId": "client-generated UUID",
  "task": "opportunity.explain_requirement",
  "instruction": "Explain the requirement in plain language.",
  "context": [
    {
      "id": "role",
      "label": "Graduate Data Analyst",
      "provenance": "opportunity",
      "content": "Graduate Data Analyst · Example Ltd"
    }
  ]
}
```

Task and provenance allowlists are defined in `features/contextual-assistant/contract.ts`. The client never sends implicit profile data or chat history.

## Successful response

```json
{
  "version": 2,
  "requestId": "same UUID",
  "proposal": {
    "kind": "explanation",
    "text": "Proposal text",
    "sourceContextIds": ["role"]
  },
  "usage": {
    "consumed": true,
    "used": 1,
    "limit": 5
  }
}
```

The server must return JSON rather than SSE for v2. The client rejects empty proposals, unknown kinds, mismatched request IDs, unknown context IDs and malformed usage data.

## Server requirements for Lovable implementation

1. Preserve the existing version-1 messages/userContext streaming branch temporarily.
2. Verify Supabase authentication using the supported server SDK rather than trusting decoded claims alone.
3. Runtime-validate task, instruction length, context count/content length and provenance.
4. Build a bounded task-specific prompt that prohibits facts not present in supplied context.
5. Enforce entitlement, quota and rate limits inside the authenticated v2 request.
6. Make `requestId` idempotent so duplicate submissions cannot double bill.
7. Consume quota only after a valid proposal is produced, or reserve and transactionally refund failures.
8. Return stable 400/401/402/409/422/429/502 errors without raw provider errors.
9. Do not log instruction/context content, CV text, notes, transcripts or provider secrets.
10. Test quota races and gateway interruption before deployment.

Until this is deployed, contextual requests will report an unsupported response and make no product mutation.
