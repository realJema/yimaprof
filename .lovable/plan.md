

# Fix: Enable Realtime on Transactions Table + Add Polling Fallback

## Root Cause Identified

The `transactions` table is **NOT** added to the Supabase Realtime publication. Only `notifications` is enabled:

```sql
-- Current state in database
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- Result: only "notifications"
```

This means when the webhook updates the transaction status to `failed` or `completed`, **no Realtime event is broadcast**, so the frontend never receives the update.

## Additional Issue

The console logs show the subscription being "CLOSED" - this could be due to:
1. React StrictMode causing double-mounting/unmounting
2. Component re-renders causing cleanup to run prematurely
3. Network instability causing the WebSocket to disconnect

---

## Solution: Two-Part Fix

### Part 1: Enable Realtime on Transactions Table

Add a database migration to enable Realtime broadcasting for the `transactions` table:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

### Part 2: Add Polling Fallback (Following the Stack Overflow Pattern)

As recommended in the provided solution, implement a hybrid approach with:
- Primary: Realtime subscription
- Fallback: Polling with exponential backoff

This ensures reliability even if Realtime fails silently.

---

## Implementation Details

### Database Migration

```sql
-- Enable realtime updates for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
```

### Update PaymentProcessing.tsx

Implement the combined Realtime + Polling pattern:

```typescript
useEffect(() => {
  if (!transactionId) return;

  let pollInterval = 2000; // Start at 2s
  let lastSyncTimestamp: string | null = null;
  let timeoutId: ReturnType<typeof setTimeout>;

  // Primary: Realtime subscription
  const channel = supabase
    .channel(`transaction:${transactionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'transactions',
        filter: `id=eq.${transactionId}`
      },
      (payload) => {
        handleTransactionUpdate(payload.new);
        lastSyncTimestamp = payload.new.updated_at;
        pollInterval = 2000; // Reset on realtime success
      }
    )
    .subscribe();

  // Fallback: Polling with exponential backoff
  const poll = async () => {
    const { data } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', transactionId)
      .single();

    if (data && (data.status === 'completed' || data.status === 'failed')) {
      handleTransactionUpdate(data);
      return; // Stop polling once resolved
    }

    // Backoff: 2s -> 3s -> 4.5s -> 6.75s -> ... -> max 30s
    pollInterval = Math.min(pollInterval * 1.5, 30000);
    timeoutId = setTimeout(poll, pollInterval);
  };

  // Start polling after initial delay
  timeoutId = setTimeout(poll, pollInterval);

  return () => {
    clearTimeout(timeoutId);
    supabase.removeChannel(channel);
  };
}, [transactionId]);
```

### Key Changes

| Aspect | Before | After |
|--------|--------|-------|
| Realtime | Only mechanism | Primary mechanism |
| Polling | None | Fallback with exponential backoff |
| Reliability | Depends on WebSocket | Works even if Realtime fails |
| Server Load | Minimal | Low (exponential backoff) |

---

## Files to Modify

1. **Database Migration** - Add `transactions` to Realtime publication
2. **src/pages/PaymentProcessing.tsx** - Add polling fallback alongside Realtime

---

## Flow After Fix

```text
1. Transaction created (pending → processing)
2. Frontend subscribes to Realtime + starts polling every 2s
3. Webhook receives confirmation, updates to completed/failed
4. EITHER:
   a. Realtime broadcasts update → UI updates immediately
   b. Polling detects status change → UI updates within backoff interval
5. UI shows success/failure, polling stops, Realtime unsubscribed
```

---

## Technical Notes

- Polling starts at 2-second intervals
- Backoff multiplier is 1.5x (gradual, not too aggressive)
- Maximum interval is 30 seconds
- Polling stops automatically once status is `completed` or `failed`
- Both mechanisms update the same state, preventing race conditions

