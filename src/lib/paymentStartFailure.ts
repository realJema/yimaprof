// Only explicit responses emitted before collection are safe to retry.
// A generic server failure or lost response may follow an actual collection.
const PRE_COLLECTION_ERRORS = new Set([
  'Missing required fields',
  'Plan or billing period unavailable',
  'Only Cameroon MTN and Orange numbers are accepted',
  'Unsupported operator',
  'No authorization header',
  'Missing Supabase configuration',
  'Invalid user',
  'MeSomb not configured',
  'Failed to create transaction',
]);

export function isConfirmedPaymentStartRefusal(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const reason = (payload as { error?: unknown }).error;
  return typeof reason === 'string' && (
    PRE_COLLECTION_ERRORS.has(reason) || /^Phone number must be 9 digits, got \d+$/.test(reason)
  );
}

export async function readPaymentStartRefusal(error: unknown): Promise<boolean> {
  if (!error || typeof error !== 'object') return false;
  const response = (error as { context?: unknown }).context;
  if (!(response instanceof Response) || response.ok) return false;
  try {
    return isConfirmedPaymentStartRefusal(await response.clone().json());
  } catch {
    return false;
  }
}