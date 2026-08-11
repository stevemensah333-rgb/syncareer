# Dashboard continuation rules

The signed-in home page is a read-only continuation surface. It fetches assessment completion, applications, saved opportunities, and the primary CV concurrently. It does not create activity, update application state, or infer recommendations.

## Primary focus

The primary focus is selected deterministically:

1. Active applications with an overdue next action, earliest due date first.
2. Active applications with a due-today or upcoming next action, earliest due date first.
3. Other active applications, most recently updated first.
4. The most recently saved opportunity that is not already represented by an application.
5. A prompt to inspect a real opportunity.

Terminal applications do not become the primary focus. When a posting is unavailable, the application title and company snapshots are used.

## Supporting information

- Attention includes real next-action dates and known saved-opportunity deadlines. Missing deadlines are not invented.
- Active applications are shown as compact rows with stable deep links.
- Saved opportunities appear as a decision queue, excluding already-tracked postings.
- CV work is suggested only when the selected active application has no linked CV.
- Interview practice is suggested only when the selected application is at the interview status.
- Assessment is secondary and appears only when the user has no application, saved opportunity, declared major, or completed assessment.
- Counsellor availability is omitted because the dashboard has no verified live-supply query.

Each source reports failure independently. Available panels remain visible after a non-critical failure. Application-data failure prevents the dashboard from claiming what the user should continue; the user receives a retry action instead.
