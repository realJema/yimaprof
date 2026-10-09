# Architecture rules

- Keep the payout introduction and secured request flow in the shared PayoutRequestDialog so school and affiliate withdrawal behavior remains consistent.
- Persist school-space tab selection in the `tab` URL parameter so refresh and browser back/forward preserve navigation context.