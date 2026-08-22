# Evidence-grounded AI application guidance

## Scope and status

This document describes the repository state after the evidence-grounding work. It does not claim that a model is fine-tuned or that Syncareer verifies candidate claims.

The frontend and tracked `career-guidance` source implement the revised contract. The changed Edge Function source still needs to be deployed through Lovable Cloud before the stricter server prompt, CV-context preflight and evidence/requirement citation enforcement are live. No deployment or remote configuration change was performed in this work.

## Current call paths

| Feature | UI entry point | Server / Edge Function | Provider | Context supplied | Output | Persistence | Main boundary or limitation |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Opportunity requirement help | `OpportunityDetail` contextual drawer | tracked `career-guidance` v2 | Lovable AI gateway; tracked model is `google/gemini-2.5-flash` | Role facts plus deterministic, traceable requirement excerpts; prompt-injection lines and boilerplate excluded | Validated explanation/outline with source context IDs | None | No candidate evidence is fetched on this surface |
| Job-specific CV bullet | `CVAIAssistant` in CV Builder | tracked `career-guidance` v2 | Lovable AI gateway; model remains server-side | Selected opportunity, one selected requirement, and one to seven user-selected CV evidence items | Text rewrite plus validated source context IDs; application layer produces a `CvSuggestion` with rationale, warnings and confidence | Accept changes only the local draft; the existing explicit CV save persists it | Revised server source must be deployed through Lovable |
| Application follow-up / notes | `ApplicationWorkspaceDetail` contextual drawer | tracked `career-guidance` v2 | Lovable AI gateway | Role/status facts and optional notes selected by the user | Validated draft with source IDs | Accept adds to the notes draft; existing notes save persists | Does not infer contact, date or motivation |
| Interview feedback explanation | `VoiceInterviewMode` contextual drawer | tracked `career-guidance` v2 | Lovable AI gateway | Role and optional report evidence | Validated explanation | None | Interview generation itself is a separate deployed-only function |
| Voice interview generation | `useVoiceInterview` | deployed-only `mock-interview`; deployed-only `interview-tts` | Provider split is not recoverable from repository source | Role/setup, interview turns and report request | Function-specific JSON/audio | `mock_interviews` through the remote function | Exact prompts, quotas and provider behavior are not locally verifiable |
| CV upload/parsing | `CVUploadDialog` / `useCVAnalysis` | deployed-only `analyze-portfolio` | Lovable gateway is documented but exact source/model is absent | User-selected PDF/DOC/DOCX, max 5 MB | Now strictly runtime-validated extraction result | User explicitly applies to draft; existing save persists | Server prompt, ownership logic and quota cannot be audited without exact deployed source |
| CV completion/quality | `CVStrengthScore` | None | None | Current local CV | Deterministic completion, writing, structure, skills and evidence categories | None | Guidance only; not ATS or hiring probability |
| Skill relevance | CV targeting context | None | None | Extracted role skills and current CV evidence | Supported / possibly supported / unsupported groups | Never writes a skill automatically | User must add or confirm evidence |
| Professional summary | No corresponding field or real feature in the current `CVData` model | None | None | None | None | None | Not implemented; broadening the CV schema was not justified |
| Cover letter | A nullable database column exists, but no real authoring flow was found | None | None | None | None | None | Not completed as part of this work |
| SynAI route | `/ai-coach` transition page | None directly | None directly | None | Routes to contextual workspaces | None | A blank generic chatbot is intentionally not exposed |

## Root causes of generic or unsafe CV responses

Before this change, the CV assistant sent only the selected bullet. The server could improve wording, but it could not know the selected job requirement or distinguish job keywords from candidate evidence. Its response contained text and broad source IDs, while the CV UI supplied a fixed rationale and did not validate newly introduced claims. The CV-upload hook also trusted a TypeScript cast instead of validating remote JSON.

The opportunity and application drawers already provided a useful integration boundary, authenticated server call, quota seam and explicit accept/reject/undo behavior. The repair extends that seam instead of introducing another provider, AI framework, vector store or generic prompt API.

## Application-level AI boundary

Product components call the typed `proposeCvBulletImprovement(input)` operation. The operation accepts:

- one verified opportunity context;
- one to three extracted requirements;
- one to seven candidate evidence records selected by the user;
- deterministic requirement/evidence matches;
- the exact original field path and text;
- a bounded user instruction.

It constructs only allowlisted contextual-assistant items. Provider URL, model, authentication, response parsing, quota handling, timeout and Lovable-specific behavior remain in the tracked `career-guidance` seam.

## Canonical context and matching

`guidance.ts` defines runtime schemas and types for `OpportunityContext`, `CandidateEvidence`, `RequirementEvidenceMatch` and `CvSuggestion`. Evidence IDs are request-scoped and deterministic from existing CV row IDs or content; no rows or tables are created.

Requirement extraction uses verified `job_postings` fields. It retains each cleaned source excerpt and excludes common company marketing, benefits, equal-opportunity boilerplate, cookie/privacy text and recognisable prompt-injection instructions. Explicit stored job skills remain requirements, never candidate skills.

Matching is deliberately conservative:

- contextual CV/project overlap can be `supported`;
- a standalone skill list is at most `partially_supported`;
- no substantive evidence is `unsupported`;
- location, work authorisation and deadline are `unclear` until the user confirms them;
- stated years of experience are not inferred from CV dates.

## Generation and validation

The server prompt treats job descriptions, CV content, labels and user instructions as untrusted data. For CV rewrites it requires at least one `requirement-*` and one `evidence-*` context before calling the gateway, and valid model output must cite both kinds before quota is consumed.

After generation, the application layer checks high-confidence factual risks:

- new numbers, percentages and metrics;
- a job skill copied into the proposal without candidate evidence;
- the target organisation presented as candidate experience;
- a newly named employer after employment wording;
- coursework/education upgraded to employment;
- activity participation upgraded to leadership;
- participation upgraded to winning;
- generic unsupported phrases and overly long bullets.

An unsafe result remains visible with its warning but cannot be accepted until edited into a safe proposal or regenerated. This is a conservative guard, not independent factual verification. Ambiguity remains for user review.

## Review and persistence

The CV review surface shows active role context, original text, editable proposed text, requirement, evidence IDs/titles, match status, rationale, warning state and confidence. It supports request, regenerate, edit, accept, reject and undo using keyboard-operable controls and a stacked mobile layout.

Accept changes only the intended field when its current value still equals the original. It updates the local draft and explicitly says the draft is not yet saved. Persistence still uses the existing primary-CV save path; no fake suggestion persistence was added.

## Fixed-example comparison

Previous model outputs were not captured. The “previous” column below is therefore an explicit inference from the old request contract (selected bullet only), not fabricated model text. Revised wording is a deterministic evaluation fixture that the new validator accepts or rejects; it is not represented as a live provider sample.

| Case | Original input | Role requirement | Available evidence | Previous output | Revised output / behavior | Unsupported claims | Specificity / relevance | Safe to review? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Software internship | “Built scripts for a class project” | Python and SQL | Project used Python/SQL to analyse 1,200 records | Not captured; old request could not see the requirement or broader project evidence | “Built Python and SQL queries to analyse 1,200 sales records” with requirement/evidence IDs | None | Specific and role-relevant | Yes |
| Data coursework | “Analysed a dataset for class” | Data analysis | Statistics coursework; no employment | Not captured; old request had no evidence category | Keeps the work as coursework/project analysis; any “worked for a client” wording is blocked | Employment upgrade is flagged | Specific without inventing employment | Yes after safe wording |
| Project coordination | “Helped with the careers event” | Coordinate schedules and logistics | Coordinated speakers and venue logistics | Not captured; old request could only polish the original line | “Coordinated speaker schedules and venue logistics for a campus careers event” | None | Concrete responsibility connection | Yes |
| Marketing without metrics | “Drafted social media posts for an event” | Social media content | Posts and event are evidenced; no metric | Not captured; old prompt encouraged impact but lacked metric provenance | Keeps the concrete activity without adding reach, growth or percentages | Invented percentages are blocked | Relevant and honest | Yes |
| Unsupported platform skill | “Built a data cleaner” | Kubernetes | No Kubernetes evidence | Not captured; old request did not receive the job requirement | Requirement remains `unsupported`; a proposal that inserts Kubernetes is blocked | Job-only skill is flagged | No false relevance | No, until evidence exists or wording omits it |

Capability-based rubric averages across those fixtures (0–5) are shown only to compare the old and new deterministic contracts. They are not live-model quality scores or hiring metrics.

| Dimension | Previous contract (inferred) | Revised local fixtures |
| --- | ---: | ---: |
| Factual consistency | 2 | 5 |
| Job relevance | 1 | 5 |
| Evidence traceability | 0 | 5 |
| Specificity | 2 | 4 |
| Usefulness | 2 | 5 |
| Unsupported-claim control | 1 | 5 |
| **Total** | **8/30** | **29/30** |

The revised deterministic contract scores higher because job context, explicit evidence references and blocking checks are now testable. No claim is made yet about live-model prose quality; that requires an authenticated canary after deployment.

## Security, operations and platform ownership

- Supabase Auth/client/function boundary: **ACTIVE PLATFORM DEPENDENCY**.
- Tracked `career-guidance` Edge Function: **USEFUL INTEGRATION**.
- Lovable AI gateway and `LOVABLE_API_KEY`: **USEFUL INTEGRATION**; secret remains server-side.
- `assistant_requests` idempotency table and existing migration: **ACTIVE PLATFORM DEPENDENCY** for the deployed v2 function; no new migration was added.
- Deployed-only `check-feature-access`: **UNKNOWN** until exact source and transaction behavior are recovered; it remains fail-closed and was not bypassed.
- Deployed-only `analyze-portfolio`, `mock-interview` and `interview-tts`: **UNKNOWN** source; their client contracts are preserved.
- Legacy v1 branch and old `components/ai-coach/*`: **HISTORICAL COMPATIBILITY**; not removed.
- PostHog integration: **UNKNOWN** live configuration; events contain only coarse task/result metadata and no CV/job text.

No database migration is proposed. Existing `job_postings`, `resumes`, `job_applications` and `user_skills` shapes plus request-scoped evidence IDs are sufficient for the current review flow.

## Deployment and manual verification

Lovable must deploy only the updated tracked `career-guidance` function from `supabase/functions/career-guidance/` using its supported deployment workflow. No secret value or connector change is required. Before rollout, run the Deno tests and then an authenticated canary for a safe rewrite, an unsupported skill, malformed output, rate limit and timeout. Confirm the deployed `check-feature-access` behavior still consumes exactly one unit only after a valid grounded proposal.

Manual live checks requiring an authenticated Lovable environment remain: request/accept/reject/edit/regenerate/undo, persistence after the normal CV save, quota/rate-limit behavior, malformed live provider output, browser console, mobile layout and keyboard traversal.

Rollback is to revert the frontend CV-guidance changes and redeploy the prior tracked `career-guidance` source. No data rollback is needed because this change adds no schema or durable suggestion records and never automatically persists suggestions.
