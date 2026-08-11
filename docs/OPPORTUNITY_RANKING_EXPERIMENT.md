# Opportunity relevance experiment — not implemented

Syncareer's current external opportunity feed is unranked and ordered by the
`job_postings.created_at` ingestion timestamp, newest first. The interface must
call it **Latest opportunities** or **External opportunities**. It must not use
match percentages, “recommended,” “tailored,” or major-based relevance claims.

The removed client heuristic inferred a generic skill list from a student's
major, assigned postings without skills a 75% match, clamped other scores to at
least 20%, and sorted the feed by that result. Those values were not a valid
ranking signal and had no outcome validation.

Any later experiment needs an explicit, testable model using only observed
inputs, such as user-selected skills, posting-provided skills, saved/applied
events, location/type preferences, and user-recorded outcomes. It should define
offline relevance labels, cold-start behavior, missing-data behavior, fairness
checks across majors and regions, and success metrics before UI exposure.

If a ranking is approved, the UI may show a short “Why this may fit” explanation
only when it can name the actual contributing facts. Percentages require a
calibrated interpretation and validation; otherwise use factual explanations
without a score. Ranking logic should live in a reviewed domain/server seam,
not as hidden component heuristics.
