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
  if (tx.status === 'completed') {
    return { ok: true, subscriptionId: tx.subscription_id ?? undefined, alreadyDone: true };
  }

  const metadata = (tx.metadata || {}) as { plan_id?: string; referred_by?: string };
  if (!metadata.plan_id) {
    return { ok: false, error: 'Missing plan_id in transaction metadata' };
  }

  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('duration_days')
    .eq('id', metadata.plan_id)
    .single();

  const durationDays = plan?.duration_days || 30;
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  // Cancel any existing active subscription for this user
  await supabase
    .from('subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('user_id', tx.user_id)
    .eq('status', 'active');

  const { data: newSub, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      user_id: tx.user_id,
      plan_id: metadata.plan_id,
      status: 'active',
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      auto_renew: true,
      referred_by: metadata.referred_by || null,
    })
    .select()
    .single();

  if (subError || !newSub) {
    console.error('Failed to create subscription:', subError);
    return { ok: false, error: 'Failed to create subscription' };
  }

  const { error: updateError } = await supabase
    .from('transactions')
    .update({
      status: 'completed',
      subscription_id: newSub.id,
      metadata: {
        ...metadata,
        ...extra,
        completed_at: new Date().toISOString(),
      },
    })
    .eq('id', tx.id)
    .neq('status', 'completed');

  if (updateError) {
    console.error('Failed to update transaction after activation:', updateError);
  }

  return { ok: true, subscriptionId: newSub.id };
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
