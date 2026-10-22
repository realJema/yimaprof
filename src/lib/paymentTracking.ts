export type PaymentTerminalStatus = 'completed' | 'failed';

export interface PaymentTrackingDependencies {
  readStatus: () => Promise<string | null>;
  reconcile: () => Promise<string | null>;
  subscribe: (receive: (status: string) => void, connected: () => void) => () => void;
  onTerminal: (status: PaymentTerminalStatus) => void;
  schedule?: (callback: () => void, delay: number) => () => void;
}

// All recovery paths only read/reconcile the SAME transaction; never collect again.
export function trackPayment(deps: PaymentTrackingDependencies): () => void {
  let stopped = false;
  let resolved = false;
  let reading = false;
  let readAgain = false;
  let pollDelay = 2000;
  let cancelPoll: (() => void) | undefined;
  let cancelReconcile: (() => void) | undefined;
  const schedule = deps.schedule ?? ((callback, delay) => {
    const timer = setTimeout(callback, delay);
    return () => clearTimeout(timer);
  });

  const receive = (status: string | null) => {
    if (stopped || resolved || (status !== 'completed' && status !== 'failed')) return;
    // Claim before awaiting subscription refresh: Realtime/poll can arrive together.
    resolved = true;
    cancelPoll?.();
    cancelReconcile?.();
    deps.onTerminal(status);
  };

  const read = async () => {
    if (stopped || resolved) return;
    if (reading) { readAgain = true; return; }
    reading = true;
    cancelPoll?.();
    try { receive(await deps.readStatus()); }
    catch { /* A network outage is not a failed payment. */ }
    finally {
      reading = false;
      if (!stopped && !resolved) {
        if (readAgain) { readAgain = false; void read(); }
        else {
          cancelPoll = schedule(() => { void read(); }, pollDelay);
          pollDelay = Math.min(pollDelay * 1.5, 15000);
        }
      }
    }
  };

  const reconcile = async () => {
    if (stopped || resolved) return;
    try { receive(await deps.reconcile()); }
    catch { /* Retain pending state until a confirmed provider outcome. */ }
    finally {
      if (!stopped && !resolved) cancelReconcile = schedule(() => { void reconcile(); }, 30000);
    }
  };

  const unsubscribe = deps.subscribe(receive, () => { void read(); });
  void read(); // Catch a webhook that arrived before the subscription was ready.
  if (!stopped && !resolved) cancelReconcile = schedule(() => { void reconcile(); }, 15000);

  return () => {
    stopped = true;
    cancelPoll?.();
    cancelReconcile?.();
    unsubscribe();
  };
}