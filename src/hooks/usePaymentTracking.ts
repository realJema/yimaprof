import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { trackPayment, type PaymentTerminalStatus } from '@/lib/paymentTracking';

export function usePaymentTracking(
  transactionId: string | null,
  userId: string | undefined,
  onTerminal: (status: PaymentTerminalStatus) => void,
) {
  const callback = useRef(onTerminal);
  callback.current = onTerminal;

  useEffect(() => {
    if (!transactionId || !userId) return;
    return trackPayment({
      readStatus: async () => {
        const { data, error } = await supabase.from('transactions')
          .select('status').eq('id', transactionId).eq('user_id', userId).maybeSingle();
        if (error) throw error;
        return data?.status ?? null;
      },
      reconcile: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return null;
        const { data, error } = await supabase.functions.invoke('check-payment-status', {
          body: { transactionId },
        });
        if (error) throw error;
        return data?.status ?? null;
      },
      subscribe: (receive, connected) => {
        const channel = supabase.channel(`payment-${transactionId}`)
          .on('postgres_changes', {
            event: 'UPDATE', schema: 'public', table: 'transactions',
            filter: `id=eq.${transactionId}`,
          }, payload => receive(String(payload.new.status)))
          .subscribe(status => { if (status === 'SUBSCRIBED') connected(); });
        const wake = () => { if (document.visibilityState === 'visible') connected(); };
        window.addEventListener('online', connected);
        document.addEventListener('visibilitychange', wake);
        return () => {
          void supabase.removeChannel(channel);
          window.removeEventListener('online', connected);
          document.removeEventListener('visibilitychange', wake);
        };
      },
      onTerminal: status => callback.current(status),
    });
  }, [transactionId, userId]);
}