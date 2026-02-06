

# Redesign Payment System: MeSomb Webhooks Architecture

## Overview

This plan completely redesigns the payment system to use **MeSomb webhooks** instead of polling, removes the atomic database functions, and increases timeouts to **3 minutes**. This creates a simpler, more reliable, and event-driven payment flow.

---

## Current Architecture (Problems)

```text
┌──────────────┐     ┌───────────────────┐     ┌─────────────┐
│   Frontend   │────▶│  mesomb-payment   │────▶│   MeSomb    │
│              │     │   (initiate)      │     │             │
└──────────────┘     └───────────────────┘     └─────────────┘
       │                                              │
       │ Polling every 10s                            │
       ▼                                              │
┌──────────────────────┐                              │
│ check-payment-status │◀─────── Manual check ────────┘
│   (queries MeSomb)   │         (no push)
└──────────────────────┘
       │
       ▼
┌──────────────────────┐     ┌───────────────────────┐
│  complete_payment_   │────▶│  Subscription created │
│  transaction (RPC)   │     │                       │
└──────────────────────┘     └───────────────────────┘
```

**Problems:**
1. Polling wastes resources (30 checks × 10s = 5 minutes of polling)
2. Complex atomic RPC functions in database
3. Timeout-based assumptions for Orange Money
4. Background cron job needed to reconcile stuck payments
5. User must click "I've confirmed" button

---

## New Architecture (Webhook-Based)

```text
┌──────────────┐     ┌───────────────────┐     ┌─────────────┐
│   Frontend   │────▶│  mesomb-payment   │────▶│   MeSomb    │
│              │     │   (initiate)      │     │             │
└──────────────┘     └───────────────────┘     └─────────────┘
       │                                              │
       │ Supabase Realtime                            │
       │ (listens to transaction)                     │
       ▼                                              ▼
┌──────────────────────┐     ┌───────────────────────────────┐
│  PaymentProcessing   │◀────│   mesomb-webhook (NEW)        │
│   (listens for       │     │   - Receives payment events   │
│    status change)    │     │   - Updates transaction       │
└──────────────────────┘     │   - Creates subscription      │
                             └───────────────────────────────┘
```

**Benefits:**
1. No polling - instant notification via webhook
2. Simpler edge functions - no complex RPC calls
3. Supabase Realtime for instant UI updates
4. No background cron job needed
5. User sees payment complete instantly

---

## Changes Summary

| Component | Action | Details |
|-----------|--------|---------|
| `mesomb-webhook` | **CREATE** | New edge function to receive MeSomb webhooks |
| `mesomb-payment` | **MODIFY** | Simplify, increase timeout to 3 min, use async mode always |
| `check-payment-status` | **DELETE** | No longer needed - webhook handles completion |
| `verify-stuck-payments` | **DELETE** | No longer needed - webhook is authoritative |
| `admin-resolve-transaction` | **MODIFY** | Simplify - manual resolution only, no RPC calls |
| `PaymentProcessing.tsx` | **MODIFY** | Use Supabase Realtime instead of polling |
| DB Functions | **DELETE** | Remove `complete_payment_transaction`, `fail_payment_transaction` |
| supabase/config.toml | **MODIFY** | Add webhook function with `verify_jwt = false` |
| MeSomb Dashboard | **CONFIGURE** | Register webhook URL |

---

## Implementation Details

### 1. Create `mesomb-webhook` Edge Function

This function receives payment status updates from MeSomb and processes them immediately.

**File:** `supabase/functions/mesomb-webhook/index.ts`

```typescript
// Key webhook payload fields from MeSomb:
// - pk: MeSomb transaction ID
// - status: SUCCESS | FAILED | PENDING | REFUNDED
// - reference: Our trxID (the transaction UUID we sent)
// - amount, fees, service, currency, etc.

serve(async (req) => {
  // No JWT verification - MeSomb calls this directly
  const payload = await req.json();
  
  console.log('Webhook received:', payload);
  
  const ourTransactionId = payload.reference; // This is our UUID
  const mesombStatus = payload.status;
  
  if (!ourTransactionId) {
    return new Response('Missing reference', { status: 400 });
  }
  
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  // Get transaction
  const { data: tx } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', ourTransactionId)
    .single();
  
  if (!tx) {
    return new Response('Transaction not found', { status: 404 });
  }
  
  // Prevent duplicate processing
  if (tx.status === 'completed' || tx.status === 'failed') {
    return new Response('Already processed', { status: 200 });
  }
  
  const metadata = tx.metadata as { plan_id?: string; referred_by?: string };
  
  if (mesombStatus === 'SUCCESS') {
    // Get plan duration
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('duration_days')
      .eq('id', metadata.plan_id)
      .single();
    
    const durationDays = plan?.duration_days || 30;
    
    // Cancel existing subscription
    await supabase
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('user_id', tx.user_id)
      .eq('status', 'active');
    
    // Create new subscription
    const { data: newSub } = await supabase
      .from('subscriptions')
      .insert({
        user_id: tx.user_id,
        plan_id: metadata.plan_id,
        status: 'active',
        started_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
        auto_renew: true,
        referred_by: metadata.referred_by || null
      })
      .select()
      .single();
    
    // Update transaction to completed
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        subscription_id: newSub?.id,
        provider_reference: payload.pk,
        metadata: {
          ...metadata,
          mesomb_webhook: payload,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', ourTransactionId);
    
    return new Response('Payment completed', { status: 200 });
    
  } else if (mesombStatus === 'FAILED' || mesombStatus === 'REFUNDED') {
    await supabase
      .from('transactions')
      .update({
        status: 'failed',
        metadata: {
          ...metadata,
          mesomb_webhook: payload,
          failure_reason: `MeSomb status: ${mesombStatus}`,
          failed_at: new Date().toISOString()
        }
      })
      .eq('id', ourTransactionId);
    
    return new Response('Payment failed', { status: 200 });
  }
  
  // PENDING - do nothing, wait for final status
  return new Response('Status pending', { status: 200 });
});
```

### 2. Modify `mesomb-payment` Edge Function

Simplify by removing RPC calls and increase timeout to 3 minutes.

**Changes:**
- Remove atomic RPC calls (let webhook handle completion)
- Increase `COLLECT_TIMEOUT_MS` to 180000 (3 minutes)
- Always use `mode: 'asynchronous'` for both carriers
- Remove complex response handling

```typescript
const COLLECT_TIMEOUT_MS = 180000; // 3 minutes

// Always async mode - webhook will handle the result
const collectRequest = {
  amount: amount,
  service: service,
  payer: cleanedPhone,
  nonce: RandomGenerator.nonce(),
  trxID: pendingTransaction.id, // Our ID for webhook reconciliation
  currency: 'XAF',
  country: 'CM',
  fees: true,
  mode: 'asynchronous', // Always async - webhook handles completion
  message: 'Subscription payment',
  reference: pendingTransaction.id // Send full UUID so webhook can find it
};

// After makeCollect, just update to 'processing' and return
// Don't try to handle completion here - webhook will do it
await supabase.from('transactions').update({
  status: 'processing',
  provider_reference: response.transaction?.pk || null,
  metadata: { 
    ...transactionMetadata, 
    mesomb_response: { status: response.status }
  }
}).eq('id', pendingTransaction.id);

return new Response(JSON.stringify({
  success: true,
  transactionId: pendingTransaction.id,
  message: 'Confirmez le paiement sur votre téléphone',
  status: 'processing'
}), { ... });
```

### 3. Modify `PaymentProcessing.tsx`

Replace polling with Supabase Realtime subscription.

**Changes:**
- Remove `setInterval` polling
- Remove `checkPaymentStatus` function
- Add Supabase Realtime subscription to listen for transaction updates
- Instant UI update when webhook updates the transaction

```typescript
useEffect(() => {
  if (!transactionId) return;
  
  // Subscribe to transaction changes via Realtime
  const channel = supabase
    .channel(`transaction-${transactionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions',
        filter: `id=eq.${transactionId}`
      },
      (payload) => {
        const newStatus = payload.new.status;
        
        if (newStatus === 'completed') {
          setStatus('completed');
          refreshSubscription();
          toast({ title: 'Paiement réussi!' });
        } else if (newStatus === 'failed') {
          setStatus('failed');
          toast({ title: 'Paiement échoué', variant: 'destructive' });
        }
      }
    )
    .subscribe();
  
  // 3 minute timeout
  const timeout = setTimeout(() => {
    setStatus('failed');
    toast({ 
      title: 'Délai expiré', 
      description: 'Le paiement n\'a pas été confirmé à temps.',
      variant: 'destructive' 
    });
  }, 180000); // 3 minutes
  
  return () => {
    supabase.removeChannel(channel);
    clearTimeout(timeout);
  };
}, [transactionId]);
```

### 4. Update `supabase/config.toml`

Add webhook function configuration:

```toml
[functions.mesomb-webhook]
verify_jwt = false  # MeSomb calls this directly without auth
```

### 5. Delete Edge Functions

Remove these functions entirely:
- `supabase/functions/check-payment-status/` (replaced by webhook)
- `supabase/functions/verify-stuck-payments/` (no longer needed)

### 6. Simplify `admin-resolve-transaction`

Keep for manual admin intervention but simplify:
- Remove RPC calls to `complete_payment_transaction` / `fail_payment_transaction`
- Use direct table updates instead
- Keep MeSomb status check capability

### 7. Remove Database Functions

Delete these functions via SQL migration:

```sql
DROP FUNCTION IF EXISTS public.complete_payment_transaction(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.fail_payment_transaction(uuid, text);
```

### 8. Configure MeSomb Dashboard

**Manual step for user:**
1. Log into MeSomb Dashboard
2. Go to Application Settings → Webhooks
3. Add webhook URL: `https://nrcdtxgmlhxbtfppxqop.supabase.co/functions/v1/mesomb-webhook`
4. Select event types: `payment.success`, `payment.failed`

---

## New Payment Flow

```text
1. User clicks "Pay" 
   └──▶ Payment.tsx navigates to PaymentProcessing with params

2. PaymentProcessing mounts
   └──▶ Calls mesomb-payment edge function
   └──▶ Subscribes to Realtime channel for transaction updates
   └──▶ Shows "Confirm on your phone" UI

3. mesomb-payment edge function
   └──▶ Creates transaction (status: pending)
   └──▶ Calls MeSomb makeCollect (async mode)
   └──▶ Updates transaction (status: processing)
   └──▶ Returns transactionId to frontend

4. User confirms on phone
   └──▶ MeSomb processes payment

5. MeSomb sends webhook to mesomb-webhook
   └──▶ Webhook updates transaction (status: completed)
   └──▶ Webhook creates subscription
   
6. Supabase Realtime pushes update to frontend
   └──▶ PaymentProcessing instantly shows "Success!"
   └──▶ Redirects to /exams2
```

---

## Timeout Handling

| Scenario | Timeout | Action |
|----------|---------|--------|
| MeSomb SDK call | 3 minutes | Assume prompt sent, return success |
| Frontend waiting | 3 minutes | Show error, suggest retry |
| Webhook delay | N/A | Webhook is authoritative - will update when received |

---

## Security Considerations

1. **Webhook Validation**: The webhook receives `reference` (our UUID) which is secret and unpredictable
2. **Idempotency**: Check transaction status before processing to prevent duplicate activations
3. **No JWT**: Webhook must be `verify_jwt = false` since MeSomb calls it directly
4. **Service Role Key**: Webhook uses service role to bypass RLS and update transactions

---

## Files to Create/Modify/Delete

**Create:**
- `supabase/functions/mesomb-webhook/index.ts`

**Modify:**
- `supabase/functions/mesomb-payment/index.ts` (simplify, 3 min timeout)
- `supabase/functions/admin-resolve-transaction/index.ts` (remove RPC calls)
- `src/pages/PaymentProcessing.tsx` (Realtime instead of polling)
- `supabase/config.toml` (add webhook function)

**Delete:**
- `supabase/functions/check-payment-status/` (entire folder)
- `supabase/functions/verify-stuck-payments/` (entire folder)

**Database Migration:**
- Drop `complete_payment_transaction` function
- Drop `fail_payment_transaction` function

---

## Post-Implementation Checklist

1. Deploy edge functions
2. Configure webhook URL in MeSomb Dashboard
3. Test with MTN number
4. Test with Orange number  
5. Verify Realtime subscription works
6. Test timeout scenarios
7. Test admin manual resolution

