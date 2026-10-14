# Architecture rules

- Keep the payout introduction and secured request flow in the shared PayoutRequestDialog so school and affiliate withdrawal behavior remains consistent.
- Persist school-space tab selection in the `tab` URL parameter so refresh and browser back/forward preserve navigation context.
- Keep lesson series arrays synchronized with the legacy primary series through a database trigger so older school forms remain compatible.
- Use shared AuthInvitation for gated registration/sign-in and allow only local return destinations to preserve navigation safely.
- Store uploaded challenge documents privately and resolve short-lived links only for staff review; never publish permanent file URLs.
- Normalize challenge JSON in its own adapter for the unchanged paper renderer, and send school review notifications from the database transition trigger.
- Keep lesson reader restrictions in LessonDocumentViewer and lesson-scoped CSS; never shield the entire cross-origin iframe because that blocks native scrolling, and never claim browser embeds conceal source URLs or prevent all copying.