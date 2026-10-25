import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { isConfirmedPaymentStartRefusal, readPaymentStartRefusal } from './paymentStartFailure';

describe('safe payment-start recovery', () => {
  for (const reason of [
    'Plan or billing period unavailable', 'Unsupported operator',
    'Phone number must be 9 digits, got 8', 'MeSomb not configured',
    'Failed to create transaction', 'Invalid user',
  ]) {
    it(`allows an explicit pre-collection refusal: ${reason}`, async () => {
      assert.equal(await readPaymentStartRefusal({
        context: new Response(JSON.stringify({ error: reason }), { status: 400 }),
      }), true);
    });
  }
  it('never treats a generic server error as proof that no debit occurred', async () => {
    assert.equal(await readPaymentStartRefusal({
      context: new Response(JSON.stringify({ error: 'Payment processing failed' }), { status: 500 }),
    }), false);
  });
  it('keeps network errors and missing responses uncertain', async () => {
    assert.equal(await readPaymentStartRefusal(new Error('Failed to fetch')), false);
    assert.equal(isConfirmedPaymentStartRefusal(null), false);
    assert.equal(isConfirmedPaymentStartRefusal({}), false);
  });
  it('does not infer a refusal from unreadable response content', async () => {
    assert.equal(await readPaymentStartRefusal({ context: new Response('Unavailable', { status: 503 }) }), false);
  });
});