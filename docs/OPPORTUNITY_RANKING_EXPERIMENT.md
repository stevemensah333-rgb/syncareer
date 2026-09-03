# Opportunity relevance — evidence-based, unvalidated

Syncareer's external opportunity feed is ordered by an explainable client-side
heuristic in `features/opportunities/ranking.ts`, using **only observed inputs**:
student major (repository-maintained role-family vocabulary), user-recorded
skills (`user_skills`), completed-assessment interests, and early-career flags.
Postings are deduplicated by canonical source URL before ordering.

The UI must call the page **Opportunities / Latest opportunities**, never
"recommended" or "tailored". It is allowed to show a short **fit explanation**
only when it can name the actual contributing facts:

- “Strong fit” / “Good fit” / “Worth a look” plus named reasons (major,
  recorded skills found in the posting, recorded interests, early-career
  language). No score, no percentage — percentages require a calibrated
  interpretation and outcome validation we do not have.
- A “check before applying” cue only for posting-listed skills that are **not
  in the student's recorded skills** — phrased as absence of a record, never as
  a capability gap.
- Nothing when the student has no personalization signals at all: the page
  invites them to add skills instead of inventing relevance.

## History

The original client heuristic inferred a generic skill list from a student's
major, assigned postings without skills a 75% match, clamped other scores to at
least 20%, and sorted the feed by that result. Those values were not a valid
ranking signal and were removed.

## Still outstanding

The current scoring is a deterministic ordering aid, not a validated model. It
has **no offline relevance labels, no outcome validation, and no calibrated
interpretation**. Before any score is exposed to users:

- define offline relevance labels and success metrics;
- decide cold-start and missing-data behavior explicitly;
- run fairness checks across majors and regions;
- move ranking logic into a reviewed domain/server seam rather than only a
  client-side helper, if score exposure is planned.

Until then, keep the factual explanation without a score.
