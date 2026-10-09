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

/** Admin: referral settings (rates, minimums, TX tax) and payout request processing. */
export function PayoutManagement() {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const { settings, refresh } = useReferralSettings();
  const [form, setForm] = useState(settings);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [filter, setFilter] = useState('pending');

  useEffect(() => setForm(settings), [settings]);

  const load = async () => {
    const { data } = await supabase.rpc('admin_list_payouts' as never);
    setPayouts((data as Payout[]) || []);
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

  const setStatus = async (p: Payout, status: 'paid' | 'rejected') => {
    const table = p.kind === 'affiliate' ? 'affiliate_payouts' : 'establishment_payouts';
    const { error } = await supabase.from(table as never).update({ status, processed_at: new Date().toISOString() } as never).eq('id', p.id);
    if (error) return toast({ title: fr ? 'Erreur' : 'Error', description: error.message, variant: 'destructive' });
    toast({ title: status === 'paid' ? (fr ? 'Retrait marqué payé' : 'Payout marked paid') : (fr ? 'Retrait refusé' : 'Payout rejected') });
    load();
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
              {shown.map((p) => (
                <TableRow key={`${p.kind}-${p.id}`}>
                  <TableCell className="text-sm whitespace-nowrap">{new Date(p.requested_at).toLocaleString(fr ? 'fr-FR' : 'en-GB')}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.beneficiary}</div>
                    <Badge variant="outline" className="text-xs">{p.kind === 'affiliate' ? (fr ? 'Parrain' : 'Referrer') : (fr ? 'Établissement' : 'School')}</Badge>
                  </TableCell>
                  <TableCell className="font-medium whitespace-nowrap">{p.amount.toLocaleString()} {p.currency}</TableCell>
                  <TableCell className="text-sm">{p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} · {p.phone}</TableCell>
                  <TableCell><Badge variant={p.status === 'paid' ? 'default' : p.status === 'rejected' ? 'destructive' : 'secondary'}>{p.status}</Badge></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {p.status === 'pending' && (
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" onClick={() => setStatus(p, 'paid')}>{fr ? 'Marquer payé' : 'Mark paid'}</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(p, 'rejected')}>{fr ? 'Refuser' : 'Reject'}</Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {shown.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">{fr ? 'Aucune demande.' : 'No request.'}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
