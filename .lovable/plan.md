# Pre-deployment deep verification

A full read-and-test pass over Syncareer. No feature changes are planned up front — only fixes for defects the verification actually finds, each reported with evidence.

## What gets verified

### 1. Repository health
- Frozen install, typecheck, full test suite, production build.
- Generated database types match the live schema in both tracked copies.

### 2. Sign-up and sign-in, every role
- Student email sign-up, confirmation path, onboarding to dashboard.
- Mentor email sign-up, four-step setup, photo upload, verification submitted.
- Google sign-in path reachable and correctly configured.
- Sign-out, password reset request, and return-to-page behaviour after sign-in.

### 3. Every page in the navigation
Dashboard, Opportunities, Applications, CV Builder, Interview, Assessment, Mentors, Career Profile, Settings, Admin, plus legal and public pages. Each is loaded in a real browser as a signed-in student and again as a mentor, checking for blank screens, console errors, failed network calls, and wrong-role access.

### 4. AI features
Contextual assistant in Opportunities, CV Builder, application workspace and interview reports; interview simulation; CV analysis; market and university insights. Each is invoked for real and checked for: a result, a bounded wait, and a clear message instead of an endless spinner when the service refuses.

### 5. Opportunities data quality
- Confirm no expired listings appear (deadline in the past).
- Confirm duplicates are collapsed and the freshness label is accurate.
- Check the daily job refresh ran and returned results.

### 6. Notifications and feedback
- Every notification switch in Settings is honoured: turning one off stops that notification, turning it on delivers it.
- Email notifications reach the send pipeline without errors.
- Feedback submission from the app appears in the admin view.

### 7. Security and access
- Signed-out visitors cannot reach protected pages or read another person's data.
- Mentor-only and admin-only areas reject the wrong role.
- Run the security scan and review findings.

## How results are reported

One summary listing, per area: what passed, what failed with the exact evidence, what was fixed, and anything that needs your decision. Nothing is deployed as part of this work.

## Fix policy during verification

- Clear defects with an obvious, contained fix (a broken route, a crash, a missing state) are fixed and re-tested in the same pass.
- Anything that would change behaviour, schema, or security posture is reported for your approval instead of being changed.

## Technical notes

- Browser checks run with Playwright at desktop and mobile widths against the local dev server, using a real authenticated session.
- Backend checks use read-only SQL and authenticated function calls; no production data is mutated except test rows created and then removed.
- Test accounts are reset after use.
- Checks run: frozen pnpm install, `typecheck`, `vitest`, `build`, `schema:repo:smoke`, `schema:types:check`, plus the database RLS test scripts under `supabase/tests/`.
