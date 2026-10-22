import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { trackPayment, type PaymentTerminalStatus } from './paymentTracking';

const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function fixture(initial: string = 'processing') {
  let receive: (status: string) => void = () => {};
  let connected: () => void = () => {};
  let status = initial;
  let checks = 0;
  let unsubscribed = false;
  const outcomes: PaymentTerminalStatus[] = [];
  const tasks: { callback: () => void; delay: number; cancelled: boolean }[] = [];
  const stop = trackPayment({
    readStatus: async () => status,
    reconcile: async () => { checks++; return status; },
    subscribe: (handler, ready) => {
      receive = handler; connected = ready;
      return () => { unsubscribed = true; };
    },
    onTerminal: result => outcomes.push(result),
    schedule: (callback, delay) => {
      const task = { callback, delay, cancelled: false };
      tasks.push(task);
      return () => { task.cancelled = true; };
    },
  });
  return { stop, outcomes, tasks, receive: (s: string) => receive(s), connected: () => connected(),
    setStatus: (s: string) => { status = s; }, checks: () => checks, unsubscribed: () => unsubscribed };
}

describe('Supabase payment tracking', () => {
  it('reads a completed payment immediately, including on page refresh', async () => {
    const f = fixture('completed');
    await flush();
    assert.deepEqual(f.outcomes, ['completed']);
    assert.equal(f.checks(), 0);
    assert.equal(f.tasks.every(t => t.cancelled), true);
    f.stop();
  });

  it('handles concurrent Realtime and database completion only once', async () => {
    const f = fixture();
    f.setStatus('completed');
    f.connected();
    f.receive('completed');
    await flush();
    assert.deepEqual(f.outcomes, ['completed']);
    f.stop();
  });

  it('recovers a missed webhook by lookup of the existing payment', async () => {
    const f = fixture();
    await flush();
    assert.deepEqual(f.outcomes, []);
    f.setStatus('completed');
    const task = f.tasks.find(t => t.delay === 15000 && !t.cancelled);
    assert.ok(task);
    task?.callback();
    await flush();
    assert.equal(f.checks(), 1);
    assert.deepEqual(f.outcomes, ['completed']);
    f.stop();
  });

  it('keeps pending payments unresolved and cancels all work on exit', async () => {
    const f = fixture();
    await flush();
    assert.deepEqual(f.outcomes, []);
    f.stop();
    f.receive('completed');
    f.tasks.forEach(t => t.callback());
    await flush();
    assert.equal(f.checks(), 0);
    assert.deepEqual(f.outcomes, []);
    assert.equal(f.unsubscribed(), true);
  });

  it('recognizes provider-confirmed failures but not unknown states', async () => {
    const f = fixture('unknown');
    await flush();
    assert.deepEqual(f.outcomes, []);
    f.receive('failed');
    f.receive('completed');
    assert.deepEqual(f.outcomes, ['failed']);
    f.stop();
  });
});