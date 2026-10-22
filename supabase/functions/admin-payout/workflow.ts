export interface Transfer {
  id: string; payout_id: string; kind: 'affiliate' | 'establishment';
  state: 'sending' | 'unknown' | 'paid' | 'failed'; amount: number;
  currency: string; phone: string; method: string; provider_reference?: string | null;
}

export interface ProviderTransaction {
  pk?: string; status?: string; amount?: number; currency?: string;
  country?: string; service?: string; type?: string;
  // MeSomb returns snake_case (b_party); some SDK versions expose bParty.
  b_party?: string; bParty?: string;
}

export function counterparty(tx?: ProviderTransaction): string {
  return tx?.b_party ?? tx?.bParty ?? '';
}

export function localPhone(phone: string): string {
  return phone.replace(/^\+/, '').replace(/^237/, '');
}

// An accepted request is not proof of a successful transfer. Only the matched
// provider transaction can settle the payout; mismatches remain reserved.
export function outcome(transfer: Transfer, tx?: ProviderTransaction): 'paid' | 'failed' | 'unknown' {
  if (!tx?.pk || Number(tx.amount) !== transfer.amount || tx.currency !== transfer.currency ||
    tx.country !== 'CM' || tx.service !== (transfer.method === 'mtn_momo' ? 'MTN' : 'ORANGE') ||
    localPhone(counterparty(tx)) !== localPhone(transfer.phone) || (tx.type && !/deposit/i.test(tx.type))) return 'unknown';
  if (tx.status === 'SUCCESS') return 'paid';
  if (tx.status === 'FAILED') return 'failed';
  return 'unknown';
}

export interface Dependencies {
  claim(): Promise<{ claimed: boolean; transfer: Transfer }>;
  find(): Promise<Transfer | null>;
  send(transfer: Transfer): Promise<ProviderTransaction | undefined>;
  check(transfer: Transfer): Promise<ProviderTransaction | undefined>;
  finish(transfer: Transfer, state: 'paid' | 'failed' | 'unknown', tx?: ProviderTransaction, error?: string): Promise<string>;
  log(event: string, transfer: Transfer): void;
}

export async function runPayout(action: 'approve' | 'reconcile', deps: Dependencies): Promise<string> {
  const result = action === 'approve' ? await deps.claim() : { claimed: false, transfer: await deps.find() };
  const transfer = result.transfer;
  if (!transfer) throw new Error('Transfer not found');
  if (transfer.state === 'paid' || transfer.state === 'failed') return transfer.state;
  let tx: ProviderTransaction | undefined;
  let error: string | undefined;
  try {
    // The database claim is durable before the one and only money-sending call.
    // Retrying a request, including after a crash or timeout, performs ONLY lookup.
    tx = result.claimed ? await deps.send(transfer) : await deps.check(transfer);
  } catch {
    error = result.claimed ? 'PROVIDER_SEND_UNCERTAIN' : 'PROVIDER_LOOKUP_UNAVAILABLE';
    deps.log(error, transfer);
    // A failed send call is not proof the provider never received the deposit:
    // run one lookup-only pass before leaving the transfer in the unknown state.
    if (result.claimed) {
      try { tx = await deps.check(transfer); } catch { deps.log('PROVIDER_LOOKUP_UNAVAILABLE', transfer); }
    }
  }
  const state = outcome(transfer, tx);
  return await deps.finish(transfer, state, tx, error ?? (state === 'unknown' ? 'AWAITING_PROVIDER_CONFIRMATION' : undefined));
}

export async function bounded<T>(promise: Promise<T>, milliseconds = 25000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Provider timeout')), milliseconds);
    })]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}