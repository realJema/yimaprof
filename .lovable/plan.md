
# Fix Payment Button Visibility and Optimize Orange Money Flow

## Problem Analysis

Two issues identified:

### Issue 1: Button Not Showing
The "J'ai confirmé le paiement" button was only added to the `processing` state, but for Orange Money payments, the page stays stuck on `initiating` because:
- The `mesomb-payment` edge function is called
- The MeSomb SDK's `makeCollect()` blocks synchronously (~90 seconds) waiting for Orange USSD confirmation
- The frontend never receives a response to transition to `processing` state
- User sees the spinner indefinitely with no button to click

### Issue 2: Orange Money Blocking
The MeSomb SDK treats Orange Money differently than MTN:
- **MTN**: Push notification → user confirms quickly → SDK returns in ~2-5 seconds
- **Orange**: USSD dialog → user takes time to respond → SDK blocks until timeout (~90 seconds)

---

## Solution

### Part 1: Show Button in Both `initiating` and `processing` States

Add the confirmation button to the `initiating` state as well, so users can click it even while the edge function is still waiting for MeSomb's response.

```text
UPDATED UI FLOW:
┌────────────────────────────────────────┐
│      (Loader spinning)                  │
│                                         │
│   Confirmez sur votre téléphone         │
│   Veuillez confirmer le paiement de     │
│   100 XAF depuis MeSomb...              │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  📱  692 482 337    [ORANGE]    │  │
│   └─────────────────────────────────┘  │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │  ✓ J'ai confirmé le paiement    │  │ ← NOW VISIBLE IN INITIATING
│   └─────────────────────────────────┘  │
└────────────────────────────────────────┘
```

### Part 2: Add Timeout to MeSomb SDK Call

Wrap the `makeCollect()` call with a `Promise.race` timeout (15 seconds). If the SDK doesn't respond in time:
1. Assume the payment prompt was sent to the user's phone
2. Set transaction to `processing` status
3. Return success immediately so frontend can show the button and start polling

```typescript
// New timeout wrapper in mesomb-payment edge function
const COLLECT_TIMEOUT_MS = 15000; // 15 seconds

const collectWithTimeout = async () => {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('COLLECT_TIMEOUT')), COLLECT_TIMEOUT_MS);
  });
  
  try {
    const response = await Promise.race([
      paymentOperation.makeCollect(collectRequest),
      timeoutPromise
    ]);
    return { response, timedOut: false };
  } catch (error) {
    if (error.message === 'COLLECT_TIMEOUT') {
      return { response: null, timedOut: true };
    }
    throw error;
  }
};
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/PaymentProcessing.tsx` | Add button to `initiating` state, modify manual check to work without transactionId |
| `supabase/functions/mesomb-payment/index.ts` | Add 15-second timeout wrapper for `makeCollect()` |

---

## Detailed Implementation

### PaymentProcessing.tsx Changes

1. **Add button to `initiating` state** - Show the same "J'ai confirmé le paiement" button that's in `processing` state

2. **Modify `handleManualCheck`** - When clicked during `initiating` (no transactionId yet), show a toast explaining the system is still setting up, or wait for transactionId

3. **Add note about checking phone** - Help user understand they need to confirm on their device first

### mesomb-payment Edge Function Changes

1. **Add `COLLECT_TIMEOUT_MS` constant** (15 seconds)

2. **Wrap `makeCollect()` with `Promise.race`**:
   ```typescript
   const COLLECT_TIMEOUT_MS = 15000;
   
   const timeoutPromise = new Promise((_, reject) => {
     setTimeout(() => reject(new Error('COLLECT_TIMEOUT')), COLLECT_TIMEOUT_MS);
   });
   
   let response = null;
   let timedOut = false;
   
   try {
     response = await Promise.race([
       paymentOperation.makeCollect(collectRequest),
       timeoutPromise
     ]);
   } catch (error) {
     if (error.message === 'COLLECT_TIMEOUT') {
       timedOut = true;
       console.log('MeSomb SDK call timed out after 15s - assuming payment prompt sent');
     } else {
       throw error;
     }
   }
   ```

3. **Handle timeout case** - Set transaction to `processing` and return success with transactionId:
   ```typescript
   if (timedOut) {
     await supabase.from('transactions').update({
       status: 'processing',
       metadata: { 
         ...transactionMetadata, 
         sdk_timeout: true,
         timeout_at: new Date().toISOString()
       }
     }).eq('id', pendingTransaction.id);
     
     return new Response(JSON.stringify({
       success: true,
       transactionId: pendingTransaction.id,
       phoneNumber: cleanedPhone,
       service: service,
       message: 'Veuillez confirmer le paiement sur votre téléphone.',
       status: 'processing',
       timedOut: true
     }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
   }
   ```

---

## Expected Behavior After Fix

### For MTN (unchanged - already works):
1. User clicks Pay → Page shows `initiating`
2. SDK returns in ~2-5 seconds → Page shows `processing` with button
3. User confirms push notification
4. Polling detects success → Shows success

### For Orange (improved):
1. User clicks Pay → Page shows `initiating` **with button visible**
2. SDK times out after 15 seconds → Page shows `processing` with button
3. User sees USSD prompt, enters PIN
4. User clicks "J'ai confirmé le paiement" button
5. System checks status immediately → Shows success

---

## Technical Notes

- The 15-second timeout is a tradeoff: long enough for fast confirmations, short enough to not keep users waiting
- The `check-payment-status` function already handles querying MeSomb API for actual status
- Adding button to `initiating` state provides immediate UX improvement while timeout fix ensures faster transition
