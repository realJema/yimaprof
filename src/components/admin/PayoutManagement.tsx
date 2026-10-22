import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { useReferralSettings } from '@/hooks/useReferralSettings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Wallet, Settings2 } from 'lucide-react';

interface Payout {
  id: string; kind: 'establishment' | 'affiliate'; beneficiary: string; amount: number; currency: string;
  method: string; phone: string; status: string; note: string | null; requested_at: string; processed_at: string | null;
}
interface PayoutTransfer {
  payout_id: string; kind: string; state: string; provider_reference: string | null;
}

/** Admin: referral settings (rates, minimums, TX tax) and payout request processing. */
export function PayoutManagement() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const { settings, refresh } = useReferralSettings();
  const [form, setForm] = useState(settings);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filter, setFilter] = useState('pending');
  const [transfers, setTransfers] = useState<PayoutTransfer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => setForm(settings), [settings]);

  const load = async () => {
    const [{ data, error }, { data: transferData, error: transferError }] = await Promise.all([
      supabase.rpc('admin_list_payouts' as never),
      supabase.from('payout_transfers' as never).select('payout_id,kind,state,provider_reference'),
    ]);
    if (error || transferError) {
      toast({ title: fr ? 'Impossible de charger les retraits' : 'Unable to load payouts', variant: 'destructive' });
      return;
    }
    setPayouts((data as Payout[]) || []);
    setTransfers((transferData as PayoutTransfer[]) || []);
  };
  useEffect(() => { load(); }, []);

  const saveSettings = async () => {
    const { error } = await supabase.from('referral_settings' as never).update({
      school_rate: Number(form.school_rate), affiliate_rate: Number(form.affiliate_rate),
      school_min_payout: Number(form.school_min_payout), affiliate_min_payout: Number(form.affiliate_min_payout),
      tax_rate: Number(form.tax_rate), tax_applied: form.tax_applied,
    } as never).eq('id', 1);
    if (error) return toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    toast({ title: fr ? 'Paramètres enregistrés' : 'Settings saved' });
    refresh();
  };

  const voidTransfer = async (p: Payout) => {
    if (busy) return;
    if (!window.confirm(fr
      ? `Annuler le versement de ${p.amount} ${p.currency} au ${p.phone} ? Ne le faites qu'après avoir vérifié dans votre tableau de bord MeSomb qu'AUCUN versement n'a eu lieu. Le retrait sera refusé et les fonds libérés.`
      : `Cancel the ${p.amount} ${p.currency} transfer to ${p.phone}? Only do this after confirming in your MeSomb dashboard that NO transfer happened. The payout will be rejected and funds released.`)) return;
    setBusy(`${p.kind}-${p.id}`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Session expired');
      const { data, error } = await supabase.functions.invoke('admin-payout', {
        body: { action: 'void', kind: p.kind, payoutId: p.id },
      });
      if (error || !data?.state) throw new Error('Void unconfirmed');
      toast({
        title: data.state === 'voided' ? (fr ? 'Versement annulé, fonds libérés' : 'Transfer cancelled, funds released')
          : data.state === 'paid' ? (fr ? 'Versement confirmé par MeSomb' : 'Transfer confirmed by the provider')
          : data.state === 'failed' ? (fr ? 'Versement échoué confirmé' : 'Transfer failure confirmed')
          : (fr ? 'Toujours en attente' : 'Still pending'),
        variant: data.state === 'failed' ? 'destructive' : 'default',
      });
    } catch {
      toast({ title: fr ? 'Annulation non confirmée' : 'Cancellation unconfirmed', description: fr ? 'Actualisez puis réessayez.' : 'Refresh and try again.', variant: 'destructive' });
    } finally {
      await load();
      setBusy(null);
    }
  };

  const setStatus = async (p: Payout, status: 'paid' | 'rejected') => {
    if (busy) return;
    const transfer = transfers.find((t) => t.payout_id === p.id && t.kind === p.kind);
    if (status === 'paid' && !transfer && !window.confirm(fr
      ? `Envoyer réellement ${p.amount} ${p.currency} au ${p.phone} par ${p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} ?`
      : `Send ${p.amount} ${p.currency} to ${p.phone} via ${p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'}?`)) return;
    setBusy(`${p.kind}-${p.id}`);
    try {
      if (status === 'rejected') {
        const table = p.kind === 'affiliate' ? 'affiliate_payouts' : 'establishment_payouts';
        const { data, error } = await supabase.from(table as never).update({ status, processed_at: new Date().toISOString() } as never).eq('id', p.id).eq('status', 'pending').select('id');
        if (error || !data?.length) throw new Error('Rejection unavailable');
        toast({ title: fr ? 'Retrait refusé' : 'Payout rejected' });
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session expired');
        const { data, error } = await supabase.functions.invoke('admin-payout', {
          body: { action: transfer ? 'reconcile' : 'approve', kind: p.kind, payoutId: p.id },
        });
        if (error || !data?.state) throw new Error('Payout unconfirmed');
        toast({
          title: data.state === 'paid' ? (fr ? 'Versement confirmé' : 'Transfer confirmed')
            : data.state === 'failed' ? (fr ? 'Versement échoué' : 'Transfer failed')
            : (fr ? 'Versement à vérifier' : 'Transfer awaiting confirmation'),
          description: data.state === 'unknown' ? (fr ? 'Les fonds restent réservés. Vérifiez le versement sans envoyer une seconde fois.' : 'Funds remain reserved. Check the transfer without sending again.') : undefined,
          variant: data.state === 'failed' ? 'destructive' : 'default',
        });
      }
    } catch {
      toast({ title: fr ? 'Retrait non confirmé' : 'Payout unconfirmed', description: fr ? 'Actualisez puis vérifiez le versement. Aucun nouvel envoi ne doit être créé tant que le résultat est incertain.' : 'Refresh and check the transfer. Do not create another transfer while the outcome is uncertain.', variant: 'destructive' });
    } finally {
      await load();
      setBusy(null);
    }
  };

  const num = (k: keyof typeof form) => (
    <Input type="number" min={0} value={String(form[k])} onChange={(e) => setForm({ ...form, [k]: e.target.value as never })} />
  );

  const shown = payouts.filter((p) => filter === 'all' || p.status === filter);

  return (
    <div className="space-y-6">
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader><CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" />{fr ? 'Règles de parrainage et retraits' : 'Referral & payout rules'}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div><Label>{fr ? 'Commission chef d’établissement (%)' : 'School head commission (%)'}</Label>{num('school_rate')}<p className="text-xs text-muted-foreground mt-1">{fr ? 'À chaque paiement du filleul' : 'On every referred payment'}</p></div>
            <div><Label>{fr ? 'Commission autres parrains (%)' : 'Other referrers commission (%)'}</Label>{num('affiliate_rate')}<p className="text-xs text-muted-foreground mt-1">{fr ? 'Premier abonnement uniquement' : 'First subscription only'}</p></div>
            <div><Label>{fr ? 'Taxe TX sur retraits (%)' : 'TX tax on payouts (%)'}</Label>{num('tax_rate')}
              <div className="flex items-center gap-2 mt-2"><Switch checked={form.tax_applied} onCheckedChange={(v) => setForm({ ...form, tax_applied: v })} /><span className="text-xs text-muted-foreground">{fr ? 'Déduire du retrait (non actif pour l’instant)' : 'Deduct from payout (not active yet)'}</span></div>
            </div>
            <div><Label>{fr ? 'Retrait minimum école (FCFA)' : 'School minimum payout (FCFA)'}</Label>{num('school_min_payout')}</div>
            <div><Label>{fr ? 'Retrait minimum parrain (FCFA)' : 'Referrer minimum payout (FCFA)'}</Label>{num('affiliate_min_payout')}</div>
          </div>
          <div className="flex justify-end"><Button onClick={saveSettings}>{fr ? 'Enregistrer' : 'Save'}</Button></div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" />{fr ? 'Demandes de retrait' : 'Payout requests'}</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{fr ? 'En attente' : 'Pending'}</SelectItem>
              <SelectItem value="paid">{fr ? 'Payés' : 'Paid'}</SelectItem>
              <SelectItem value="rejected">{fr ? 'Refusés' : 'Rejected'}</SelectItem>
              <SelectItem value="failed">{fr ? 'Échoués' : 'Failed'}</SelectItem>
              <SelectItem value="all">{fr ? 'Tous' : 'All'}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fr ? 'Date' : 'Date'}</TableHead>
                <TableHead>{fr ? 'Bénéficiaire' : 'Beneficiary'}</TableHead>
                <TableHead>{fr ? 'Montant' : 'Amount'}</TableHead>
                <TableHead>{fr ? 'Versement' : 'Payout to'}</TableHead>
                <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shown.map((p) => {
                const transfer = transfers.find((t) => t.payout_id === p.id && t.kind === p.kind);
                const checking = p.status === 'pending' && Boolean(transfer);
                const label = p.status === 'paid' ? (fr ? 'Payé' : 'Paid') : p.status === 'failed' ? (fr ? 'Échoué' : 'Failed') : p.status === 'rejected' ? (fr ? 'Refusé' : 'Rejected') : checking ? (fr ? 'À vérifier' : 'Awaiting confirmation') : (fr ? 'En attente' : 'Pending');
                return (
                <TableRow key={`${p.kind}-${p.id}`}>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(p.requested_at).toLocaleString(fr ? 'fr-FR' : 'en-GB')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.beneficiary}</div>
                    <Badge variant="outline" className="text-xs">{p.kind === 'affiliate' ? (fr ? 'Parrain' : 'Referrer') : (fr ? 'Établissement' : 'School')}</Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{p.amount.toLocaleString()} {p.currency}</TableCell>
                  <TableCell className="text-sm">{p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} · {p.phone}</TableCell>
                  <TableCell><Badge variant={p.status === 'paid' ? 'default' : ['rejected', 'failed'].includes(p.status) ? 'destructive' : 'secondary'}>{label}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {p.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" disabled={Boolean(busy)} onClick={() => setStatus(p, 'paid')}>{busy === `${p.kind}-${p.id}` ? (fr ? 'Traitement…' : 'Processing…') : checking ? (fr ? 'Vérifier le versement' : 'Check transfer') : (fr ? 'Valider et verser' : 'Approve and send')}</Button>
                        {!transfer && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => setStatus(p, 'rejected')}>{fr ? 'Refuser' : 'Reject'}</Button>}
                        {transfer && <Button size="sm" variant="outline" disabled={Boolean(busy)} onClick={() => voidTransfer(p)}>{fr ? 'Annuler sans versement' : 'Cancel without transfer'}</Button>}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ); })}
            </TableBody>
          </Table>
          {shown.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">{fr ? 'Aucune demande.' : 'No request.'}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
