// Refresh access only: this helper must never initiate or reconcile a debit.
export async function refreshPaymentAccess(
  refresh: () => Promise<boolean>,
  isCancelled: () => boolean,
  wait: () => Promise<void> = () => new Promise(resolve => setTimeout(resolve, 1000)),
): Promise<boolean> {
  for (let attempt = 0; attempt < 10; attempt++) {
    if (isCancelled()) return false;
    try {
      const ready = await refresh();
      if (isCancelled()) return false;
      if (ready) return true;
    } catch {
      // A read error does not change the confirmed payment outcome.
    }
    if (attempt < 9 && !isCancelled()) await wait();
  }
  return false;
}