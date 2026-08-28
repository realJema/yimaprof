# Fix the MeSomb payment gateway

## What I found (verified in the database and code)

1. **The webhook URL you created points to the wrong project.** You configured
   `https://ddxhdrzmlpqjfuvwpepf.supabase.co/functions/v1/mesomb-webhook`, but this app's Supabase
   project is `nrcdtxgmlhxbtfppxqop`. The correct URL is:
   `https://nrcdtxgmlhxbtfppxqop.supabase.co/functions/v1/mesomb-webhook`
   MeSomb has been calling another project, so no notification ever reached us.

2. **Payments succeed at MeSomb but stay stuck.** The four most recent transactions
   (2 x 100 FCFA on 27 Aug, 2 x 1000 FCFA on 13 Aug) carry the MeSomb message
   "The payment has been successfully done!" yet remain `processing`, so no subscription
   was created. The payment function fires the MeSomb call and never finalises it — the
   webhook is the only path to completion, and it never arrived.

3. **Status values don't match.** The webhook only recognises `SUCCESS` / `FAILED`, but the
   stored MeSomb statuses show `SUCCESS` and `FAIL`. `FAIL`/`SUCCEED` variants would be ignored.

4. **No signature check.** The webhook accepts any request; your new secret key isn't used yet.

5. **`check-payment-status` is declared in the config but the function does not exist** — there is
   no way to reconcile a payment if the webhook is missed.

## What I will change

1. **Store the webhook secret** (`MESOMB_WEBHOOK_SECRET`) and verify every incoming webhook
   request against it (signature/secret header, with the raw body logged once for shape discovery);
   reject unauthenticated calls with 401.
2. **Harden `mesomb-webhook`**: accept status variants (`SUCCESS`/`SUCCEED`/`SUCCESSFUL` and
   `FAIL`/`FAILED`/`CANCELLED`/`REFUNDED`), locate our transaction from `reference`, `trxID`,
   nested `transaction.*`, or `provider_reference` as fallback, and keep the existing idempotency
   and subscription-activation logic untouched.
3. **Add a safety net so a missed webhook can no longer block a paid user**: finalise the
   transaction from the MeSomb SDK response in `mesomb-payment` when it reports success (reusing
   the same activation logic, guarded by the same idempotency check), and add a
   `check-payment-status` function the processing page can call as a last resort after the
   webhook/polling window.
4. **Reconcile the stuck successful payments**: activate the subscriptions for the transactions
   that MeSomb confirmed as paid and mark them `completed` (the two failed ones stay failed).
5. **Test end-to-end**: call the webhook directly with a simulated MeSomb payload (valid and
   invalid secret) and confirm the transaction completes and the subscription activates.

## What stays untouched

Payment initiation UX, MeSomb credentials, subscription plans, affiliate commissions, RLS,
routes, and the existing Realtime + polling flow on `/payment-processing`.

## Action needed from you

Update the webhook URL in your MeSomb dashboard to the `nrcdtxgmlhxbtfppxqop` URL above.
