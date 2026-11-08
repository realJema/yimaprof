# Challenge fullscreen behavior

## Verified behavior

- Starting requests browser fullscreen when supported; refusal does not prevent participation.
- The running timer does not pause when fullscreen is left.
- `fullscreenchange` exits increment a counter held only in the current page state and display a warning. Reloading resets this counter.
- Exit counts and events are not persisted in `challenge_attempts`, the local recovery session or the offline submission queue.
- Scoring does not read the exit counter: no score penalty or automatic disqualification is applied.
- Browser navigation/unload warnings discourage leaving, but cannot guarantee confinement or prevent all tab/app switches.

## Results

- Personal scores retain the current post-submission behavior.
- Top results are available after `ends_at`, enforced by the database as well as the interface.
- The best submitted attempt per user is ranked by normalized score, then time spent and submission time. At most 100 participants are returned.
- Only usernames, scores and elapsed time are returned. Answers, emails and school names are excluded.
- Access requires sign-in and the existing challenge scope (or school/admin authorization); an active subscription remains required by the challenge list's existing interface.
- Existing challenge scores are client-submitted. This change displays the existing stored scores and does not introduce an independently audited or fraud-proof grading system.

## Verification limits

Public pages and automated rule tests were checked. Live authenticated challenge submission and administrative course/price saving could not be exercised with the external Supabase connection's unavailable test session.