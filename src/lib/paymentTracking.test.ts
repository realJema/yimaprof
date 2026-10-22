import { describe, it, expect } from 'bun:test';
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
    expect(f.outcomes).toEqual(['completed']);
    expect(f.checks()).toBe(0);
    expect(f.tasks.every(t => t.cancelled)).toBe(true);
    f.stop();
  });

  it('handles concurrent Realtime and database completion only once', async () => {
    const f = fixture();
    f.setStatus('completed');
    f.connected();
    f.receive('completed');
    await flush();
    expect(f.outcomes).toEqual(['completed']);
    f.stop();
  });

  it('recovers a missed webhook by lookup of the existing payment', async () => {
    const f = fixture();
    await flush();
    expect(f.outcomes).toEqual([]);
    f.setStatus('completed');
    const task = f.tasks.find(t => t.delay === 15000 && !t.cancelled);
    expect(task).toBeDefined();
    task?.callback();
    await flush();
    expect(f.checks()).toBe(1);
    expect(f.outcomes).toEqual(['completed']);
    f.stop();
  });

  it('keeps pending payments unresolved and cancels all work on exit', async () => {
    const f = fixture();
    await flush();
    expect(f.outcomes).toEqual([]);
    f.stop();
    f.receive('completed');
    f.tasks.forEach(t => t.callback());
    await flush();
    expect(f.checks()).toBe(0);
    expect(f.outcomes).toEqual([]);
    expect(f.unsubscribed()).toBe(true);
  });

  it('recognizes provider-confirmed failures but not unknown states', async () => {
    const f = fixture('unknown');
    await flush();
    expect(f.outcomes).toEqual([]);
    f.receive('failed');
    f.receive('completed');
    expect(f.outcomes).toEqual(['failed']);
    f.stop();
  });
});