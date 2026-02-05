

## Fix Orange Money Payment Validation - Complete Solution

### Root Cause Analysis

After reviewing the MeSomb documentation and the current implementation, I identified the critical issues:

---

### Issue 1: Missing `trxID` Parameter in Collect Request

**Current Code** (`mesomb-payment/index.ts` lines 234-244):
```typescript
const collectRequest = {
  amount: amount,
  service: service,
  payer: cleanedPhone,
  nonce: RandomGenerator.nonce(),
  currency: 'XAF',
  country: 'CM',
  fees: true,
  message: 'Subscription payment',
  reference: `sub_${pendingTransaction.id.substring(0, 8)}`  // This is NOT trxID!
};
```

**Problem**: The `reference` field is NOT the same as `trxID`. According to MeSomb docs:
- `trxID` = "ID of the transaction on your side. This can be used for reconciliation."
- This is what allows using `getTransactions([id], 'EXTERNAL')` to look up the transaction later.

**Fix**: Add `trxID: pendingTransaction.id` to the collect request.

---

### Issue 2: Status Check Only Works When `provider_reference` Exists

**Current Code** (`check-payment-status/index.ts` lines 118-129):
```typescript
if (applicationKey && accessKey && secretKey && transaction.provider_reference) {
  // Only queries MeSomb if provider_reference exists
  const mesombTransactions = await paymentOperation.getTransactions([transaction.provider_reference]);
}
```

**Problem**: For Orange Money with SDK timeout, we never get a `provider_reference`, so this code path is **never executed**. The payment just stays "processing" forever.

**Fix**: 
1. Use `trxID` (our transaction UUID) to query MeSomb with `source: 'EXTERNAL'`
2. Query even when `provider_reference` is null
3. Fall back to `provider_reference` for legacy transactions

---

### Issue 3: Use `checkTransactions` Instead of `getTransactions` for Status Verification

Per MeSomb documentation:
- `getTransactions()` - Fetches transaction details from MeSomb's cache
- `checkTransactions()` - "This operation is useful to confirm the status of transactions if the current status is not the one you expect"

For payment verification, `checkTransactions()` is the correct method because it re-checks with the mobile money provider rather than returning cached status.

---

### Issue 4: Background Job Ignores Transactions Without `provider_reference`

**Current Code** (`verify-stuck-payments/index.ts` lines 46-51):
```typescript
.eq('status', 'processing')
.not('provider_reference', 'is', null)  // <-- Skips Orange timeout transactions!
.lt('created_at', fiveMinutesAgo);
```

**Problem**: Orange Money transactions that timed out have no `provider_reference`, so they're never checked.

**Fix**: Query all processing transactions and use `EXTERNAL` source to look them up by our transaction ID.

---

### Implementation Plan

#### File 1: `supabase/functions/mesomb-payment/index.ts`

1. **Add `trxID` to collect request** (line ~234-244):
```typescript
const collectRequest = {
  amount: amount,
  service: service,
  payer: cleanedPhone,
  nonce: RandomGenerator.nonce(),
  trxID: pendingTransaction.id,  // ADD THIS - enables EXTERNAL lookup
  currency: 'XAF',
  country: 'CM',
  fees: true,
  mode: service === 'ORANGE' ? 'asynchronous' : 'synchronous', // ADD THIS
  message: 'Subscription payment',
  reference: `sub_${pendingTransaction.id.substring(0, 8)}`
};
```

2. **Set async mode for Orange** to prevent blocking.

---

#### File 2: `supabase/functions/check-payment-status/index.ts`

1. **Remove the `provider_reference` requirement** from the condition
2. **Use `checkTransactions` with EXTERNAL source first** (our transaction ID)
3. **Fall back to `provider_reference` if EXTERNAL lookup fails** (for legacy)

Changes to lines 113-129:
```typescript
// For processing transactions, check MeSomb API for actual status
if (transaction.status === 'processing' || transaction.status === 'pending') {
  const applicationKey = Deno.env.get('MESOMB_APP_KEY');
  const accessKey = Deno.env.get('MESOMB_ACCESS_KEY');
  const secretKey = Deno.env.get('MESOMB_SECRET_KEY');
  
  if (applicationKey && accessKey && secretKey) {  // Remove provider_reference check
    console.log('Checking MeSomb API for transaction status...');
    
    try {
      const paymentOperation = new PaymentOperation({
        applicationKey, accessKey, secretKey,
      });
      
      // Try EXTERNAL lookup first (using our transaction ID as trxID)
      console.log('Checking MeSomb by EXTERNAL ID:', transaction.id);
      let mesombTransactions = await paymentOperation.checkTransactions(
        [transaction.id], 
        'EXTERNAL'
      );
      
      // Fallback to provider_reference if EXTERNAL lookup returns nothing
      if ((!mesombTransactions || mesombTransactions.length === 0) && transaction.provider_reference) {
        console.log('EXTERNAL lookup empty, trying provider_reference:', transaction.provider_reference);
        mesombTransactions = await paymentOperation.checkTransactions(
          [transaction.provider_reference],
          'MESOMB'
        );
      }
      
      // Rest of the logic remains the same...
    }
  }
}
```

---

#### File 3: `supabase/functions/verify-stuck-payments/index.ts`

1. **Remove the `provider_reference` filter** for processing transactions
2. **Use `checkTransactions` with EXTERNAL source**
3. **Add fallback to provider_reference for legacy**

Changes to lines 43-78:
```typescript
// Find ALL stuck transactions (processing for > 5 minutes)
const { data: stuckTransactions, error: fetchError } = await supabase
  .from('transactions')
  .select('*')
  .eq('status', 'processing')
  .lt('created_at', fiveMinutesAgo)
  .limit(50);  // Add limit for safety

// For each transaction:
for (const tx of stuckTransactions || []) {
  // Try EXTERNAL lookup first (using our ID as trxID)
  let mesombTxs = await paymentOp.checkTransactions([tx.id], 'EXTERNAL');
  
  // Fallback to provider_reference if needed
  if ((!mesombTxs || mesombTxs.length === 0) && tx.provider_reference) {
    mesombTxs = await paymentOp.checkTransactions([tx.provider_reference], 'MESOMB');
  }
  
  // Process results...
}
```

---

### Summary of Changes

| File | Change | Purpose |
|------|--------|---------|
| `mesomb-payment/index.ts` | Add `trxID: pendingTransaction.id` | Enable EXTERNAL lookup |
| `mesomb-payment/index.ts` | Add `mode: 'asynchronous'` for Orange | Prevent USSD blocking |
| `check-payment-status/index.ts` | Remove `provider_reference` requirement | Check Orange payments |
| `check-payment-status/index.ts` | Use `checkTransactions([id], 'EXTERNAL')` | Query by our ID |
| `check-payment-status/index.ts` | Fallback to provider_reference | Legacy compatibility |
| `verify-stuck-payments/index.ts` | Remove `provider_reference` filter | Include Orange timeouts |
| `verify-stuck-payments/index.ts` | Use `checkTransactions` with EXTERNAL | Same as above |

---

### Expected Flow After Fix

```text
1. User initiates Orange payment
2. mesomb-payment sends collect with trxID=our-uuid, mode=asynchronous
3. MeSomb returns quickly (async mode), or we timeout after 15s
4. Transaction saved with status='processing' (may not have provider_reference)
5. User confirms on phone, clicks "J'ai confirmé le paiement"
6. check-payment-status calls checkTransactions([our-uuid], 'EXTERNAL')
7. MeSomb returns status='SUCCESS'
8. Subscription is activated
```

---

### Testing Plan

After deployment:
1. Initiate Orange Money payment with 100 XAF
2. Confirm on phone via USSD
3. Click "J'ai confirmé le paiement" button
4. Verify subscription is activated
5. Check edge function logs for the EXTERNAL lookup path

