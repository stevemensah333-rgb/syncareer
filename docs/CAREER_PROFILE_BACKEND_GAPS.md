# Career Profile — backend support inventory and proposed additions

Status: **proposal** — no migration in this document has been applied. It records
which parts of the Career Profile result experience the current backend supports
and which parts are derived client-side or intentionally omitted, per the Career
Assessment redesign.

The Career Profile object (AGENTS.md "Career objects") is:

> Career Profile = interests + direction + skills + evidence + gaps + goals.

## What the backend supports today (used by the redesign)

| Profile part | Source | Persisted? | Notes |
|---|---|---|---|
| Interest themes | `assessments.work_interest_score_json`, `primary/secondary/tertiary_interest` | Yes — one row per completed assessment | Canonical deterministic RIASEC scorer; scoring methodology unchanged. |
| Work preferences ("what this suggests") | `assessments.personality_score_json`, `assessments.skills_score_json` | Yes — same row | Aggregations of self-report answers Q1–30; displayed as preferences, not skills. |
| Career directions | `careers` table (`riasec_profile`, `required_skills`, …) matched against the latest assessment | Reference data | Cosine match in `useCareerRecommendations`; scoring unchanged. |
| Relevant skills | `user_skills` (student-recorded) | Yes | Filtered to skills expected by the strongest directions. |
| Evidence | `evidence_items` (+ `evidence_sources`) from the evidence dossier | Yes | Counts and recent titles shown; "supported" = source attached, never externally verified. |
| Target roles | Saved opportunities: `saved_jobs` → `job_postings.title` | Yes | Saved roles are the product's only persisted "role I'm aiming at" signal. |
| Gaps | Derived: `careers.required_skills` minus `user_skills` | Derived | Labelled "not yet recorded in Syncareer" — never a claim of inability. |
| Market signal | Current `job_postings` (active, external): skill frequency in postings whose titles match a direction | Live data, not stored | Contextual guidance; market intelligence per major remains on `/analysis`. |
| Longitudinal view | All `assessments` rows for the user | Yes | Latest vs. previous comparison; older rows listed. No data invented. |

## What is NOT persisted today (and how the UI handles it)

1. **Career goals.** There is no goals table. The profile shows an honest
   "not part of your saved profile yet" status instead of an editable field.
2. **Career-direction preferences** ("this interests me" / "show later" /
   "not for me"). The result view reorders in-memory only, with on-screen
   copy stating scores and saved preferences are not rewritten.
3. **A first-class Career Profile row.** Interest themes live on assessment
   rows; there is no single `career_profiles` table holding the latest
   aggregated profile. Everything in the result view is derived at read time.

## Proposed backend changes (not applied — require migration + rollback plan)

These would make the profile a durable, connective anchor rather than a
derived view. Each is additive; none changes RIASEC scoring.

### 1. `career_direction_preferences`

Persists the result-page direction corrections.

- `id uuid pk`, `user_id uuid references auth.users on delete cascade`
- `career_id text references careers(id)` (or `career_id uuid` to match the
  careers PK type in the live schema)
- `preference text check (preference in ('prioritised','neutral','deprioritised','dismissed'))`
  — mirrors `RoleFamilyPreference` in `features/assessment/roleFamilies.ts`
- `created_at`, `updated_at timestamptz`
- Unique `(user_id, career_id)`; owner-scoped RLS (select/insert/update own
  rows); writes via a SECURITY DEFINER function consistent with the evidence
  dossier pattern.

### 2. `career_goals`

Persists explicit student goals.

- `id uuid pk`, `user_id uuid references auth.users on delete cascade`
- `title text not null`, `notes text`, `target_role text null`
  (must never accept a RIASEC label as a role — reuse
  `safeExplicitTargetRole` validation)
- `status text check (status in ('active','achieved','dropped')) default 'active'`
- `target_date date null`, `created_at`, `updated_at`
- Owner-scoped RLS; writes via SECURITY DEFINER function.

### 3. (Optional) `career_profiles` latest-aggregation row

A one-row-per-user snapshot written when an assessment completes (in the same
transaction/edge flow that already calls `compute-user-intelligence`), holding
the latest top-three themes and top direction ids. Read paths already work
without this; it would only simplify cross-surface display (dashboard,
opportunities ranking) and guarantee a stable anchor.

## Verification expectations for any applied migration

- Migration + rollback script under `supabase/migrations` / `supabase/rollback`
  following the evidence dossier pattern (owner RLS, SECURITY DEFINER writes).
- RLS matrix test entries in `supabase/tests/rls_authorization_matrix.sql`.
- Generated Supabase types regenerated through the supported Lovable sync and
  kept byte-identical between `src/integrations/supabase/types.ts` copies
  (`pnpm run schema:types:check`).
- The frontend keeps working when the tables are absent (the current read-time
  derivation is the fallback), exactly as the evidence feature does today.
