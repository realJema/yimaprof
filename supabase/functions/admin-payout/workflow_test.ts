import { assertEquals, assertRejects } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { bounded, outcome, runPayout, type Transfer, type ProviderTransaction, type Dependencies } from './workflow.ts';

const transfer: Transfer = { id: 'transfer-1', payout_id: 'payout-1', kind: 'affiliate', state: 'sending', amount: 20, currency: 'XAF', method: 'mtn_momo', phone: '+237670123456' };
const transaction: ProviderTransaction = { pk: 'provider-1', type: 'DEPOSIT', status: 'SUCCESS', amount: 20, currency: 'XAF', country: 'CM', service: 'MTN', bParty: '670123456' };
function harness() {
  let stored: Transfer | null = null;
  let sends = 0;
  let checks = 0;
  let providerTx: ProviderTransaction | undefined = transaction;
  let failure = false;
  const deps: Dependencies = {
    async claim() { const claimed = !stored; stored ??= { ...transfer }; return { claimed, transfer: { ...stored } }; },
    async find() { return stored; },
    async send(t) { sends++; assertEquals(t.amount, 20); assertEquals(t.phone, '+237670123456'); if (failure) throw new Error('Timeout'); return providerTx; },
    async check() { checks++; return providerTx; },
    async finish(t, state) { if (!stored) throw new Error('No claim'); if (stored.state === 'paid' || stored.state === 'failed') return stored.state; stored = { ...t, state }; return state; },
    log() {},
  };
  return { deps, sends: () => sends, checks: () => checks, stored: () => stored, setTx: (tx?: ProviderTransaction) => providerTx = tx, fail: () => failure = true };
}
Deno.test('Confirmed 20 FCFA deposit to the requested number settles as paid', async () => {
  const h = harness(); assertEquals(await runPayout('approve', h.deps), 'paid'); assertEquals(h.sends(), 1);
});
Deno.test('API acceptance or pending transaction must not mark paid', async () => {
  const h = harness(); h.setTx({ ...transaction, status: 'PENDING' }); assertEquals(await runPayout('approve', h.deps), 'unknown');
});
Deno.test('Wrong recipient cannot mark a payout paid', () => {
  assertEquals(outcome(transfer, { ...transaction, bParty: '690123456' }), 'unknown');
});
Deno.test('Wrong amount cannot mark a payout paid', () => {
  assertEquals(outcome(transfer, { ...transaction, amount: 500 }), 'unknown');
});
Deno.test('A non-deposit transaction cannot settle a deposit', () => {
  assertEquals(outcome(transfer, { ...transaction, type: 'COLLECT' }), 'unknown');
});
Deno.test('Explicit matched provider failure remains unpaid', async () => {
  const h = harness(); h.setTx({ ...transaction, status: 'FAILED' }); assertEquals(await runPayout('approve', h.deps), 'failed');
});
Deno.test('Timeout reserves funds; repeated approval checks without sending again', async () => {
  const h = harness(); h.fail(); assertEquals(await runPayout('approve', h.deps), 'unknown');
  assertEquals(await runPayout('approve', h.deps), 'paid'); assertEquals(h.sends(), 1); assertEquals(h.checks(), 1);
});
Deno.test('Concurrent approvals send at most once', async () => {
  const h = harness(); await Promise.all([runPayout('approve', h.deps), runPayout('approve', h.deps)]); assertEquals(h.sends(), 1);
});
Deno.test('Missing provider transaction never releases uncertain payout', async () => {
  const h = harness(); h.setTx(); assertEquals(await runPayout('approve', h.deps), 'unknown');
  assertEquals(await runPayout('reconcile', h.deps), 'unknown'); assertEquals(h.sends(), 1);
});
Deno.test('Paid payout cannot be sent a second time', async () => {
  const h = harness(); await runPayout('approve', h.deps); await runPayout('approve', h.deps); assertEquals(h.sends(), 1);
});
Deno.test('Settlement storage failure cannot cause a second deposit', async () => {
  const h = harness(); const finish = h.deps.finish; h.deps.finish = async () => { throw new Error('DB unavailable'); };
  await assertRejects(() => runPayout('approve', h.deps)); h.deps.finish = finish;
  assertEquals(await runPayout('approve', h.deps), 'paid'); assertEquals(h.sends(), 1);
});
Deno.test('Provider timeout is bounded without assuming transfer failure', async () => {
  await assertRejects(() => bounded(new Promise(() => {}), 5), Error, 'Provider timeout');
});