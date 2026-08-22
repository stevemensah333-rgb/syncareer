# Contextual assistant v2 handoff

## Status

**Base v2 was previously recorded as deployed. The evidence-grounding revision is implemented in the repository and requires a Lovable redeployment** (`supabase/functions/career-guidance`). No deployment was performed as part of the revision. The function routes explicitly on `version`: a `version: 2` body goes to the validated JSON handler, anything else falls through to the legacy SSE branch. A malformed v2 body never falls through.

Modules:

- `contract.ts` — task/provenance/kind allowlists, size limits, request and model-output validation.
- `prompts.ts` — bounded per-family server prompts built only from supplied context.
- `handler.ts` — dependency-injected flow: validate → authenticate → reserve → entitlement → gateway → validate output → commit one unit.
- `index.ts` — real dependencies (Supabase Auth `getUser`, `check-feature-access`, `assistant_requests`, Lovable AI gateway) plus the retained legacy branch.
- `index.test.ts` — 18 Deno tests, synthetic fixtures only. Run: `deno test --allow-net supabase/functions/career-guidance/index.test.ts`.

The revision adds a CV preflight requiring opportunity, `requirement-*` and `evidence-*` context, requires the model to cite both evidence and requirement IDs, treats all context as untrusted data, and adds a 30-second gateway timeout. See `AI_APPLICATION_GUIDANCE.md` for the application-layer evidence and review contract.

### Live audit findings (recorded before implementation)

- `career-guidance` had **no invocations** in the retained log window; the frontend sends only v2 and `/ai-coach` is a static transition page. No live v1 caller was found. Legacy branch retained until **2026-09-30**; remove if the logs still show no v1 traffic then.
- Quota feature key: `ai_coach_session` (free tier 5/month), enforced by the deployed-only `check-feature-access` (still `UNKNOWN` source — called, never rewritten or bypassed). If it is unreachable the server fails closed.
- No durable idempotency store existed. Added the smallest additive table `assistant_requests` with a unique `(user_id, request_id)` pair, service-role only, RLS enabled.

### Not yet verified

An authenticated canary for the four workflow families has **not** been run: no test session is available to this environment. Sign in through the Lovable preview so a session is injected, then the canary can be executed.


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
