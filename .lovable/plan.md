
# Fix: Return Immediately After Payment Initiation

## Problem Identified

The edge function `mesomb-payment` is waiting for the MeSomb SDK's `makeCollect()` call to complete before returning to the frontend. This causes a 17+ second delay where:

1. Frontend shows "Initialisation du paiement..."
2. MeSomb SDK is called and **blocks** waiting for user confirmation
3. User receives USSD prompt on phone
4. User confirms payment
5. SDK finally returns
6. Frontend receives response and shows "Processing"

The user sees the payment prompt on their phone **while the page still says "Initializing"**, which is confusing.

---

## Solution: Fire-and-Forget Pattern

Modify the edge function to:
1. Create the pending transaction
2. Start the MeSomb SDK call **without awaiting** (fire-and-forget)
3. Return immediately to the frontend with `status: 'processing'`
4. Let the webhook handle the final status update

This way, the frontend transitions to "Confirm on your phone" **before** the user receives the USSD prompt.

---

## Implementation

### Modify `supabase/functions/mesomb-payment/index.ts`

```text
BEFORE:
  const response = await paymentOperation.makeCollect(collectRequest);
  // ... wait for response, update transaction, return

AFTER:
  // Fire-and-forget: Start the SDK call but don't await it
  paymentOperation.makeCollect(collectRequest)
    .then(async (response) => {
      // Update transaction with MeSomb response (for debugging)
      await supabase.from('transactions').update({
        provider_reference: response.reference || response.transaction?.pk || null,
        metadata: { 
          ...transactionMetadata, 
          mesomb_status: response.status,
          mesomb_message: response.message,
          sdk_returned_at: new Date().toISOString()
        }
      }).eq('id', pendingTransaction.id);
    })
    .catch((error) => {
      console.error('MeSomb SDK error (background):', error);
    });
  
  // Return immediately - don't wait for SDK response
  return new Response(JSON.stringify({
    success: true,
    transactionId: pendingTransaction.id,
    phoneNumber: cleanedPhone,
    service: service,
    message: 'Confirmez le paiement sur votre téléphone.',
    status: 'processing'
  }), { ... });
```

### Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| SDK Call | `await makeCollect()` (blocking) | `makeCollect().then()` (fire-and-forget) |
| Response Time | 17+ seconds (waits for user) | < 1 second (immediate) |
| Status on Return | After SDK completes | Immediately `processing` |
| Error Handling | In main flow | Background logging only |

### Flow After Fix

```text
1. User clicks Pay → Navigates to PaymentProcessing
2. Frontend shows "Initialisation..."
3. Edge function creates transaction
4. Edge function starts makeCollect() (fire-and-forget)
5. Edge function returns IMMEDIATELY (~200ms total)
6. Frontend shows "Confirmez sur votre téléphone"
7. MeSomb sends USSD prompt to phone
8. User confirms payment
9. Webhook receives notification, updates transaction
10. Realtime pushes update to frontend
11. Frontend shows "Paiement réussi!"
```

---

## Files to Modify

- `supabase/functions/mesomb-payment/index.ts` - Change to fire-and-forget pattern

---

## What Stays the Same

- Transaction is created with `pending` status initially
- Transaction is updated to `processing` immediately after creation
- Webhook handles final status (`completed` or `failed`)
- Realtime subscription notifies frontend
- All existing validation and error handling for initial checks

---

## Edge Cases Handled

1. **SDK call fails**: Logged in background, webhook will still fire if MeSomb processed it
2. **SDK call times out**: Deno runtime will clean up, webhook is authoritative
3. **Network error**: User waits, webhook eventually updates status
4. **Webhook never arrives**: Admin can manually resolve via admin panel
