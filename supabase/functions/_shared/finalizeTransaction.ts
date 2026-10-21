// Shared finalisation logic for MeSomb payments.
// Used by mesomb-webhook, mesomb-payment and check-payment-status so that a
// payment is activated exactly once, whichever path confirms it first.

// deno-lint-ignore no-explicit-any
type Supa = any;

export const SUCCESS_STATUSES = ['SUCCESS', 'SUCCEED', 'SUCCEEDED', 'SUCCESSFUL', 'COMPLETED'];
export const FAILURE_STATUSES = ['FAIL', 'FAILED', 'FAILURE', 'CANCELLED', 'CANCELED', 'REFUNDED', 'ERRORED'];

export function normalizeStatus(status: unknown): 'success' | 'failed' | 'pending' | 'unknown' {
  const s = String(status ?? '').trim().toUpperCase();
  if (!s) return 'unknown';
  if (SUCCESS_STATUSES.includes(s)) return 'success';
  if (FAILURE_STATUSES.includes(s)) return 'failed';
  if (s === 'PENDING' || s === 'PROCESSING' || s === 'INITIATED') return 'pending';
  return 'unknown';
}

export async function activateSubscriptionForTransaction(
  supabase: Supa,
  // deno-lint-ignore no-explicit-any
  tx: any,
  extra: Record<string, unknown> = {},
): Promise<{ ok: boolean; subscriptionId?: string; error?: string; alreadyDone?: boolean }> {
  // All three writes (cancel old subscription, create new subscription, mark
  // transaction completed) run inside a single Postgres transaction via the
  // finalize_payment_transaction function. The function locks the transaction
  // row (FOR UPDATE), so concurrent confirmations (webhook + polling) are
  // serialized and any mid-flow failure rolls everything back.
  const { data, error } = await supabase.rpc('finalize_payment_transaction', {
    p_transaction_id: tx.id,
    p_extra: extra,
  });

  if (error) {
    console.error('Failed to finalize transaction atomically:', error);
    return { ok: false, error: 'Failed to finalize transaction' };
  }

  const result = (data || {}) as {
    ok?: boolean;
    subscription_id?: string | null;
    already_done?: boolean;
    error?: string;
  };

  if (!result.ok) {
    return { ok: false, error: result.error || 'Failed to finalize transaction' };
  }

  return {
    ok: true,
    subscriptionId: result.subscription_id ?? undefined,
    alreadyDone: result.already_done === true,
  };
}

export async function markTransactionFailed(
  supabase: Supa,
  // deno-lint-ignore no-explicit-any
  tx: any,
  reason: string,
  extra: Record<string, unknown> = {},
) {
  const metadata = (tx.metadata || {}) as Record<string, unknown>;
  const { error } = await supabase
    .from('transactions')
    .update({
      status: 'failed',
      metadata: {
        ...metadata,
        ...extra,
        failure_reason: reason,
        failed_at: new Date().toISOString(),
      },
    })
    .eq('id', tx.id)
    .not('status', 'in', '("completed","failed")');

  if (error) console.error('Failed to mark transaction failed:', error);
}
