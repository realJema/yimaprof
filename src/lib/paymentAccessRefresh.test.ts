import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { refreshPaymentAccess } from './paymentAccessRefresh';

describe('Access refresh after confirmed payment', () => {
  it('refreshes immediately and stops as soon as access is available', async () => {
    let reads = 0;
    let waits = 0;
    const ready = await refreshPaymentAccess(async () => ++reads === 3, () => false, async () => { waits++; });
    assert.equal(ready, true);
    assert.equal(reads, 3);
    assert.equal(waits, 2);
  });

  it('does not delay access that is already available', async () => {
    let reads = 0;
    const ready = await refreshPaymentAccess(async () => { reads++; return true; }, () => false,
      async () => { assert.fail('No waiting for an active subscription'); });
    assert.equal(ready, true);
    assert.equal(reads, 1);
  });

  it('bounds failed reads without treating a confirmed payment as failed', async () => {
    let reads = 0;
    const ready = await refreshPaymentAccess(async () => { reads++; throw new Error('Offline'); }, () => false, async () => {});
    assert.equal(ready, false);
    assert.equal(reads, 10);
  });

  it('cancels navigation if the user leaves during a subscription read', async () => {
    let cancelled = false;
    const ready = await refreshPaymentAccess(async () => { cancelled = true; return true; }, () => cancelled);
    assert.equal(ready, false);
  });
});