# Syncareer legal review required

This is a product/repository reconciliation record, not legal advice. The legal pages retain their existing clauses until the owner and qualified counsel approve substantive changes.

## Verified and current

| Area | Classification | Repository evidence |
|---|---|---|
| Public legal routes | VERIFIED AND CURRENT | `App.tsx` exposes `/terms` and `/privacy`; the landing footer, sitemap and sign-up agreement use these paths. |
| Backend boundary | VERIFIED AND CURRENT | The frontend uses Lovable Cloud's Supabase-compatible Auth, PostgREST/RLS, Storage and Edge Function interfaces. |
| Google sign-in | VERIFIED AND CURRENT | `GoogleSignInButton.tsx` uses the existing OAuth integration. |
| Paystack entry points | VERIFIED AND CURRENT | `PaystackButton.tsx`, `Pricing.tsx` and `SubscriptionManager.tsx` invoke Paystack-based subscription flows. |
| Consent-gated analytics | VERIFIED AND CURRENT | `services/analytics.ts` disables capture unless configuration and explicit local consent are both present; session recording and automatic capture are disabled. |
| CV and interview records | VERIFIED AND CURRENT | Résumés and mock-interview records are persisted through the Supabase-compatible client; interview UI displays transcript evidence. |
| Legal-page structure | FORMAT ONLY | Shared layout, navigation, anchors, typography and print rules change presentation without approving new clauses. |

## Terms and Conditions

| Section | Classification | Existing wording / issue | Evidence and missing live evidence | Owner question | Legal review | Priority |
|---|---|---|---|---|---|---|
| Description of Service | OUTDATED PRODUCT DESCRIPTION | Describes a general “career intelligence platform,” skill analysis, career-path matching and AI career recommendations. | Current repository journey is opportunity-first and contextual; explicit matching behavior is not the primary product contract. Live product positioning was not independently audited here. | Which currently operating services should the Terms define? | Yes | High |
| User Data & Content | POTENTIAL LEGAL ISSUE | Grants a non-exclusive licence to process user content for career recommendations. | Repository processes CV, profile, application and interview data for several workflows; scope and controller identity are not documented. | Is this licence scope and entity identity approved by counsel? | Yes | High |
| AI-Generated Recommendations | OUTDATED PRODUCT DESCRIPTION | Broadly describes career insights and recommendations. | Current AI experience is contextual proposals within opportunity/CV/application/interview workflows. Deployed gateway contract and model terms were not recovered. | Which AI tasks and provider terms should be disclosed? | Yes | High |
| Payments & Subscriptions | UNVERIFIED PLATFORM CLAIM | Gives “Stripe, Mobile Money, etc.” as examples and leaves refunds conditional. | Repository uses Paystack and lists GH₵30 monthly/GH₵300 yearly. Pricing also claims a 30-day annual refund, but no verified refund implementation or approved policy was found. | Confirm provider, amounts/currency, renewal, cancellation and refund policy. | Yes | Blocking |
| Modifications | POTENTIAL LEGAL ISSUE | Says material changes will be notified and continued use is acceptance. | Email and notification mechanisms exist, but no verified legal-notice operating procedure was found. | How are material legal changes actually approved and delivered? | Yes | High |
| Termination | UNVERIFIED PLATFORM CLAIM | Says users may delete accounts at any time. | Settings calls a `delete-account` Edge Function, but deployed source and deletion completeness were not verified. | What data is deleted, retained, or de-identified, and on what timing? | Yes | High |
| Governing Law | POTENTIAL LEGAL ISSUE | Selects Republic of Ghana law and local dispute resolution. | No entity registration or counsel approval is recorded in repository evidence. | Confirm contracting entity, address, governing law and dispute mechanism. | Yes | Blocking |

## Privacy Policy

| Section | Classification | Existing wording / issue | Evidence and missing live evidence | Owner question | Legal review | Priority |
|---|---|---|---|---|---|---|
| Information We Collect | UNVERIFIED PLATFORM CLAIM | Lists employer role, interview recordings, portfolio uploads, IP/device data and approximate location. | Student/counsellor roles, CVs, assessments and transcript-like interview messages exist. Employer role, uploaded video/audio storage, public portfolio and location collection were not verified. | Exactly which fields/media/technical identifiers are collected in production? | Yes | High |
| How We Use Information | OUTDATED PRODUCT DESCRIPTION | Claims student/employer matching, marketing email consent, aggregated research and fraud detection. | Counsellor booking exists; employer matching and research purposes were not verified. Email consent operations and fraud tooling are unclear. | Which purposes are active, and what lawful/consent basis supports each? | Yes | High |
| AI Processing | UNVERIFIED PLATFORM CLAIM | Names Gemini and OpenAI, Lovable AI Gateway, inference-only use and no training. | Lovable AI integration is useful infrastructure, but exact deployed providers, payloads, retention and training terms are not established by frontend code. | Obtain current gateway/provider subprocessors and data-use terms. | Yes | Blocking |
| Sharing | UNVERIFIED PLATFORM CLAIM | Names Supabase, Paystack, Resend and Lovable; describes counsellor and employer disclosure. | Supabase-compatible and Paystack calls are present. Resend and live employer disclosure were not verified; Lovable Cloud ownership complicates controller/processor descriptions. | Confirm every current subprocessor and recipient, purpose, region and role. | Yes | Blocking |
| Cookies & Tracking | MISSING DISCLOSURE | Describes essential and consented analytics cookies but does not name PostHog. | PostHog is dynamically loaded only after consent, with localStorage+cookie persistence; production key/configuration was not inspected. | Should PostHog and the consent withdrawal mechanism be named explicitly? | Yes | High |
| Data Security | UNVERIFIED PLATFORM CLAIM | Claims encrypted storage, hashed passwords and optional two-factor authentication. | HTTPS/RLS/Auth integration exists; encryption details and a user-facing 2FA flow were not verified. | Which security representations are supportable and monitored? | Yes | High |
| Data Retention | POTENTIAL LEGAL ISSUE | Promises permanent deletion within 30 days with legal-retention exceptions. | A delete-account caller exists, but deployed deletion logic, backups, logs and financial-record retention were not verified. | Approve a retention schedule and verify deletion implementation against it. | Yes | Blocking |
| Your Rights | POTENTIAL LEGAL ISSUE | Promises access, correction, download, deletion, consent withdrawal and objection. | Some editing/deletion and unsubscribe surfaces exist; complete export and objection workflows were not verified. | Which rights apply by jurisdiction and how are requests authenticated/fulfilled? | Yes | Blocking |
| Children's Privacy | POTENTIAL LEGAL ISSUE | Sets minimum age at 16. | No repository evidence establishes age gating or parental-consent handling. | Confirm intended audience age and required minor safeguards. | Yes | Blocking |
| International Transfers | UNVERIFIED PLATFORM CLAIM | Names US/EU processing and promises appropriate safeguards. | Vendor regions, transfer mechanisms and contracts were not available. | Where is production data processed and which transfer mechanisms apply? | Yes | Blocking |
| Contact/controller | MISSING DISCLOSURE | Provides an email and website but no controller/legal entity identity or address. | Repository does not establish the contracting/controller entity. | Confirm legal entity name, registration/address and privacy contact. | Yes | Blocking |
| Changes to Policy | POTENTIAL LEGAL ISSUE | Promises email or in-app notice and continued-use acceptance. | No verified legal-notice workflow or version ledger was found. | Define approval, versioning and notice procedures. | Yes | High |

## Additional operational questions

- Confirm whether interview audio is ever uploaded. The active interface states camera/screen are not requested and displays transcript messages, while the policy says “interview recordings.”
- Confirm whether transactional email uses Resend in production and whether webhook/email payload retention is documented.
- Confirm counsellor availability, booking, message and credential data access boundaries against live RLS.
- Reconcile the pricing page’s refund and payment-method claims with Paystack configuration and an approved cancellation/refund procedure.
- Establish a documented legal-document owner, version history and approval record before changing the effective date.
