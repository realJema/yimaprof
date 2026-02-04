

## ACID-Compliant Payment System Fix

This plan addresses the critical issue where users are charged via mobile money but subscriptions are not created. The root causes are:

1. **Race conditions** - Multiple non-atomic operations across edge functions and database
2. **Missing provider references** - SDK errors/timeouts result in transactions stuck without references
3. **No background verification** - Reliance solely on frontend polling means closed browsers = abandoned transactions
4. **Non-atomic subscription activation** - Transaction update and subscription creation are separate operations

---

### ACID Principles Applied

| Principle | Current Issue | Solution |
|-----------|--------------|----------|
| **Atomicity** | Transaction update and subscription creation are separate calls that can fail independently | Wrap all database mutations in a single database transaction using a new RPC function |
| **Consistency** | Transactions can be `completed` without a subscription, or `processing` forever | Add database constraints and state machine validation |
| **Isolation** | Multiple status checks can run simultaneously, potentially activating duplicate subscriptions | Use database locks and idempotency checks |
| **Durability** | Frontend polling is ephemeral; if user closes browser, verification stops | Add background cron job to verify all stuck transactions |

---

### Implementation Steps

#### Step 1: Create Atomic Database Function

Create a new database function `complete_payment_transaction` that atomically:
1. Verifies transaction is still in `processing` or `pending` state (idempotency)
2. Creates/activates the subscription
3. Updates transaction to `completed` with subscription_id
4. Returns success/failure

```sql
CREATE OR REPLACE FUNCTION public.complete_payment_transaction(
  p_transaction_id UUID,
  p_plan_id UUID,
  p_user_id UUID,
  p_referred_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_record RECORD;
  current_subscription_id UUID;
  new_subscription_id UUID;
  result JSON;
BEGIN
  -- Lock the transaction row to prevent concurrent modifications
  SELECT * INTO tx_record
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  -- Idempotency: If already completed, return success
  IF tx_record.status = 'completed' THEN
    RETURN json_build_object(
      'success', true,
      'already_completed', true,
      'subscription_id', tx_record.subscription_id
    );
  END IF;
  
  -- Validate transaction is in correct state
  IF tx_record.status NOT IN ('processing', 'pending') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Transaction not in valid state for completion: ' || tx_record.status
    );
  END IF;
  
  -- Validate user owns this transaction
  IF tx_record.user_id != p_user_id THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User does not own this transaction'
    );
  END IF;
  
  -- Cancel any existing active subscription for this user
  UPDATE subscriptions
  SET status = 'canceled', updated_at = now()
  WHERE user_id = p_user_id AND status = 'active'
  RETURNING id INTO current_subscription_id;
  
  -- Create new subscription
  INSERT INTO subscriptions (
    user_id, plan_id, status, started_at, expires_at, 
    auto_renew, referred_by, created_at, updated_at
  ) VALUES (
    p_user_id, p_plan_id, 'active', now(), 
    now() + interval '30 days', true, p_referred_by, now(), now()
  ) RETURNING id INTO new_subscription_id;
  
  -- Update transaction to completed with subscription_id
  UPDATE transactions
  SET 
    status = 'completed',
    subscription_id = new_subscription_id,
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'completed_at', now()::text,
      'previous_subscription_id', current_subscription_id
    )
  WHERE id = p_transaction_id;
  
  RETURN json_build_object(
    'success', true,
    'subscription_id', new_subscription_id,
    'cancelled_subscription_id', current_subscription_id
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$;
```

#### Step 2: Create Fail Transaction Function

```sql
CREATE OR REPLACE FUNCTION public.fail_payment_transaction(
  p_transaction_id UUID,
  p_reason TEXT DEFAULT 'Payment failed'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  tx_record RECORD;
BEGIN
  -- Lock the transaction row
  SELECT * INTO tx_record
  FROM transactions
  WHERE id = p_transaction_id
  FOR UPDATE;
  
  -- Idempotency: If already failed, return success
  IF tx_record.status = 'failed' THEN
    RETURN json_build_object('success', true, 'already_failed', true);
  END IF;
  
  -- If already completed, don't mark as failed
  IF tx_record.status = 'completed' THEN
    RETURN json_build_object('success', false, 'error', 'Cannot fail completed transaction');
  END IF;
  
  -- Update to failed
  UPDATE transactions
  SET 
    status = 'failed',
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'failed_at', now()::text,
      'failure_reason', p_reason
    )
  WHERE id = p_transaction_id;
  
  RETURN json_build_object('success', true);
END;
$$;
```

#### Step 3: Update check-payment-status Edge Function

Replace the current non-atomic logic with calls to the atomic database functions:

```typescript
// In check-payment-status/index.ts

// When MeSomb confirms SUCCESS:
if (mesombTx.status === 'SUCCESS') {
  const metadata = transaction.metadata as { plan_id?: string; referred_by?: string } || {};
  
  // Use atomic database function
  const { data: result, error } = await supabase.rpc('complete_payment_transaction', {
    p_transaction_id: transactionId,
    p_plan_id: metadata.plan_id,
    p_user_id: user.id,
    p_referred_by: metadata.referred_by || null
  });
  
  if (error || !result?.success) {
    console.error('Atomic completion failed:', error || result?.error);
    // Return processing to retry later
    return Response.json({ status: 'processing', message: 'Retrying...' });
  }
  
  return Response.json({
    status: 'completed',
    subscription_id: result.subscription_id
  });
}

// When MeSomb confirms FAILED/CANCELLED:
if (mesombTx.status === 'FAILED' || mesombTx.status === 'CANCELLED') {
  await supabase.rpc('fail_payment_transaction', {
    p_transaction_id: transactionId,
    p_reason: `MeSomb status: ${mesombTx.status}`
  });
  
  return Response.json({ status: 'failed' });
}
```

#### Step 4: Create Background Verification Edge Function

Create a new edge function `verify-stuck-payments` that runs on a schedule (cron) to catch any payments that were confirmed by MeSomb but never processed:

```typescript
// supabase/functions/verify-stuck-payments/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PaymentOperation } from 'https://esm.sh/@hachther/mesomb@2.0.1';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
  
  // Find stuck transactions (processing for > 5 minutes with provider_reference)
  const { data: stuckTransactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('status', 'processing')
    .not('provider_reference', 'is', null)
    .lt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
  
  const paymentOp = new PaymentOperation({
    applicationKey: Deno.env.get('MESOMB_APP_KEY')!,
    accessKey: Deno.env.get('MESOMB_ACCESS_KEY')!,
    secretKey: Deno.env.get('MESOMB_SECRET_KEY')!,
  });
  
  let processed = 0;
  
  for (const tx of stuckTransactions || []) {
    try {
      const mesombTxs = await paymentOp.getTransactions([tx.provider_reference]);
      
      if (mesombTxs?.[0]) {
        const mesombStatus = mesombTxs[0].status;
        const metadata = tx.metadata as any || {};
        
        if (mesombStatus === 'SUCCESS') {
          await supabase.rpc('complete_payment_transaction', {
            p_transaction_id: tx.id,
            p_plan_id: metadata.plan_id,
            p_user_id: tx.user_id,
            p_referred_by: metadata.referred_by || null
          });
          processed++;
        } else if (mesombStatus === 'FAILED' || mesombStatus === 'CANCELLED') {
          await supabase.rpc('fail_payment_transaction', {
            p_transaction_id: tx.id,
            p_reason: `Background check: ${mesombStatus}`
          });
          processed++;
        }
        // PENDING status: leave as-is for next check
      }
    } catch (e) {
      console.error(`Error processing tx ${tx.id}:`, e);
    }
  }
  
  // Also fail very old stuck transactions without provider_reference
  const { data: zombieTxs } = await supabase
    .from('transactions')
    .select('id')
    .eq('status', 'processing')
    .is('provider_reference', null)
    .lt('created_at', new Date(Date.now() - 30 * 60 * 1000).toISOString());
  
  for (const tx of zombieTxs || []) {
    await supabase.rpc('fail_payment_transaction', {
      p_transaction_id: tx.id,
      p_reason: 'No provider reference after 30 minutes'
    });
    processed++;
  }
  
  return Response.json({ processed, checked: (stuckTransactions?.length || 0) + (zombieTxs?.length || 0) });
});
```

#### Step 5: Set Up Scheduled Execution

Configure the background job using Supabase's pg_cron:

```sql
-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the verification job to run every 5 minutes
SELECT cron.schedule(
  'verify-stuck-payments',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT net.http_post(
    url := 'https://nrcdtxgmlhxbtfppxqop.supabase.co/functions/v1/verify-stuck-payments',
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  $$
);
```

#### Step 6: Update mesomb-payment for Better Initial Handling

Improve the initial payment function to handle SDK errors more gracefully:

```typescript
// Key changes in mesomb-payment/index.ts:

// 1. Only set to "processing" if we got a valid response with reference
const response = await paymentOperation.makeCollect(collectRequest);
const providerRef = response.reference || response.transaction?.pk || null;
const isSuccess = response.isOperationSuccess();

if (isSuccess && providerRef) {
  // Valid response with reference - set to processing
  await supabase.from('transactions').update({
    status: 'processing',
    provider_reference: providerRef,
    metadata: { ...metadata, mesomb_status: response.status }
  }).eq('id', pendingTransaction.id);
} else if (!isSuccess && response.status === 'FAIL') {
  // Clear failure from MeSomb - fail immediately
  await supabase.rpc('fail_payment_transaction', {
    p_transaction_id: pendingTransaction.id,
    p_reason: response.message || 'MeSomb rejected payment'
  });
  
  return Response.json({ 
    success: false, 
    error: response.message || 'Payment was rejected'
  }, { status: 400 });
}
// ... rest of handling
```

#### Step 7: Add Admin Tool for Manual Resolution

Create an admin function to manually check and resolve transactions:

```typescript
// supabase/functions/admin-resolve-transaction/index.ts

// Allows admin to:
// 1. Check MeSomb status for any transaction
// 2. Force-complete a transaction (with proper verification)
// 3. Force-fail a transaction
```

---

### Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/check-payment-status/index.ts` | Modify - use atomic RPC functions |
| `supabase/functions/mesomb-payment/index.ts` | Modify - better error handling, fail early on rejections |
| `supabase/functions/verify-stuck-payments/index.ts` | **Create** - background verification job |
| `supabase/functions/admin-resolve-transaction/index.ts` | **Create** - admin manual resolution tool |
| `supabase/config.toml` | Modify - add new function configs |
| Database migration | **Create** - add `complete_payment_transaction` and `fail_payment_transaction` functions |
| Database migration | **Create** - add pg_cron schedule for background job |

---

### Transaction State Machine

```text
        ┌──────────────┐
        │   pending    │
        └──────┬───────┘
               │ MeSomb call made
               ▼
        ┌──────────────┐
        │  processing  │◄──────────────┐
        └──────┬───────┘               │
               │                       │
     ┌─────────┼─────────┐             │
     │         │         │             │
     ▼         ▼         ▼             │
 ┌───────┐ ┌───────┐ ┌───────┐    Retry on
 │SUCCESS│ │ FAIL  │ │PENDING│────error
 └───┬───┘ └───┬───┘ └───────┘
     │         │
     ▼         ▼
┌─────────┐ ┌──────┐
│completed│ │failed│
└─────────┘ └──────┘
```

---

### Benefits

1. **Atomicity**: All database changes in a single transaction - no partial states
2. **Consistency**: Idempotency checks prevent duplicate subscriptions
3. **Isolation**: Row-level locks prevent race conditions
4. **Durability**: Background job catches any missed payments
5. **Reliability**: Users who close browser still get their subscriptions
6. **Visibility**: Clear failure reasons stored in metadata for debugging

