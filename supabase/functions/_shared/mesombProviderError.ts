// Explicit provider configuration refusals happen before any Mobile Money
// collection. Other errors remain uncertain and must never be treated as safe
// to retry automatically.
export const PAYMENT_PROVIDER_UNAVAILABLE = 'payment_provider_unavailable';

export function mesombErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? 'Unknown MeSomb error');
}

export function isInactiveMesombApiKey(error: unknown): boolean {
  return /this api key is not active/i.test(mesombErrorMessage(error));
}
