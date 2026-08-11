# Learning resource boundary

## Current capability

Syncareer supports a small, contextual decision flow from a job requirement to an evidence-building next step. It appears in opportunity details, application details, and CV tailoring context. A requirement is never copied into a CV or profile automatically.

The available decisions are: add truthful evidence, identify the requirement as something being learned, create a bounded practice/project idea, look for a maintained external resource, or mark the requirement as not relevant for the current visit. Decisions are currently session-local because no demonstrated persistence requirement justifies a table or reuse of unrelated profile/application fields.

## External resources

The configured catalogue is intentionally empty. The repository has no established owner, link-checking process, or analytics-consent evidence that would support a trustworthy external catalogue. The interface therefore provides an honest unavailable state and directs the user to the deterministic practice idea. It does not scrape or search YouTube, Coursera, or the open web.

Any future configured resource must include provider, title, known cost/free status, estimated time, level, intended outcome, relevance rationale, URL, and the date the URL was last checked. Adding entries also requires a named operational owner and review cadence.

## Retired learning infrastructure

The dropped learning tables and `update_learning_streak` database function remain retired. The deployed-only `generate-module-quiz`, `suggest-courses`, and `suggest-free-resources` functions have no current source or call sites and are classified as **HISTORICAL COMPATIBILITY / GENERATED CODE DEBT**. This implementation neither calls, deploys, restores, nor removes them.

## Analytics

No learning events are emitted in this stage because general analytics-consent behavior has not been established. After that boundary exists, privacy-safe event names may cover resource opened, dismissed, already know, practice selected, and evidence editing opened. Requirement text, CV contents, application notes, and other personal data must not be event properties.
