# Architecture rules
- Execute admin-approved payouts only through admin-payout with a durable unique database claim, atomic provider-confirmed settlement and lookup-only recovery; provider reference/nonce alone do not guarantee idempotency.

- Keep the payout introduction and secured request flow in the shared PayoutRequestDialog so school and affiliate withdrawal behavior remains consistent.
- Persist school-space tab selection in the `tab` URL parameter so refresh and browser back/forward preserve navigation context.
- Keep lesson series arrays synchronized with the legacy primary series through a database trigger so older school forms remain compatible.
- Use shared AuthInvitation for gated registration/sign-in and allow only local return destinations to preserve navigation safely.
- Store uploaded challenge documents privately and resolve short-lived links only for staff review; never publish permanent file URLs.
- Normalize challenge JSON in its own adapter for the unchanged paper renderer, and send school review notifications from the database transition trigger.
- Keep lesson reader restrictions in LessonDocumentViewer and lesson-scoped CSS; never shield the entire cross-origin iframe because that blocks native scrolling, and never claim browser embeds conceal source URLs or prevent all copying.
- Keep the native mobile shell in Capacitor with the web build as the single source of truth; the sandbox hot-reload `server.url` must be removed before any store build so the app ships its bundled assets.
- Stuck payout transfers are released only through the admin-payout "void" action, which first re-checks the provider and can never void a transfer the provider confirms; voided payouts become rejected so balances unblock.

- Track subscription payments through usePaymentTracking (Realtime, immediate read and lookup-only reconciliation); retain MeSomb background work with EdgeRuntime.waitUntil so navigation never waits for collection and an unknown outcome never triggers another debit.
- After confirmed payment, use bounded subscription-only reads before a single replacement reload of the content destination; never reload the payment initiation URL or navigate to paid content before access is readable.
