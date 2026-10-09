import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReferralSettings } from '@/hooks/useReferralSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PayoutRequestDialog from './PayoutRequestDialog';
import { Wallet } from 'lucide-react';

interface Payout { id: string; amount: number; method: string; phone: string; status: string; requested_at: string }

/** Referrer balance (pending earnings minus pending/paid payouts) and payout requests. */
export default function AffiliatePayouts() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { settings } = useReferralSettings();
  const [earned, setEarned] = useState(0);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  const load = useCallback(async () => {
    if (!user) return;
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from('affiliate_earnings').select('amount, status').eq('affiliate_id', user.id),
      supabase.from('affiliate_payouts' as never).select('id, amount, method, phone, status, requested_at').eq('affiliate_id', user.id).order('requested_at', { ascending: false }),
    ]);
    setEarned((e || []).filter((r) => r.status === 'pending').reduce((s, r) => s + r.amount, 0));
    setPayouts((p as Payout[]) || []);
  }, [user]);
  useEffect(() => { load(); }, [load]);

  const withdrawn = payouts.filter((p) => p.status === 'pending' || p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const available = Math.max(0, earned - withdrawn);

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg flex items-center gap-2"><Wallet className="h-5 w-5" />{fr ? 'Retirer mes gains' : 'Withdraw my earnings'}</CardTitle>
          <p className="text-2xl font-bold mt-2">{available.toLocaleString()} FCFA</p>
          <p className="text-xs text-muted-foreground">{fr ? 'Solde disponible' : 'Available balance'}</p>
        </div>
        <PayoutRequestDialog kind="affiliate" available={available} minPayout={settings.affiliate_min_payout} onDone={load} />
      </CardHeader>
      {payouts.length > 0 && (
        <CardContent className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span>{new Date(p.requested_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</span>
              <span className="font-medium">{p.amount.toLocaleString()} FCFA</span>
              <span className="text-muted-foreground">{p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} · {p.phone}</span>
              <Badge variant={p.status === 'paid' ? 'secondary' : p.status === 'rejected' ? 'destructive' : 'outline'}>{p.status}</Badge>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
