import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Wallet } from 'lucide-react';

interface Commission {
  id: string;
  referred_name: string | null;
  plan_name: string | null;
  amount: number;
  status: string;
  created_at: string;
}

interface Payout {
  id: string;
  amount: number;
  method: string;
  phone: string;
  status: string;
  requested_at: string;
}

export default function SchoolRevenue({ establishmentId }: { establishmentId: string }) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { user } = useAuth();
  const { toast } = useToast();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'mtn_momo', phone: '', password: '' });

  const load = async () => {
    const [{ data: com }, { data: pay }] = await Promise.all([
      supabase.from('establishment_commissions').select('id, referred_name, plan_name, amount, status, created_at').eq('establishment_id', establishmentId).order('created_at', { ascending: false }),
      supabase.from('establishment_payouts').select('id, amount, method, phone, status, requested_at').eq('establishment_id', establishmentId).order('requested_at', { ascending: false }),
    ]);
    setCommissions((com as Commission[]) || []);
    setPayouts((pay as Payout[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [establishmentId]);

  useEffect(() => {
    const channel = supabase
      .channel('school-revenue')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'establishment_commissions' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'establishment_payouts' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [establishmentId]);

  const total = commissions.reduce((s, c) => s + c.amount, 0);
  const available = commissions.filter((c) => c.status === 'available').reduce((s, c) => s + c.amount, 0);
  const pending = commissions.filter((c) => c.status === 'pending').reduce((s, c) => s + c.amount, 0);
  const paid = commissions.filter((c) => c.status === 'paid').reduce((s, c) => s + c.amount, 0);

  const monthly = commissions
    .filter((c) => new Date(c.created_at) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((s, c) => s + c.amount, 0);

  // Step 1: password check + OTP email. Step 2: OTP confirmation creates the payout server-side.
  const startRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('payout-security', {
      body: {
        action: 'request',
        establishmentId,
        amount: parseInt(form.amount, 10),
        method: form.method,
        phone: form.phone.trim(),
        password: form.password,
      },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({
        title: fr ? 'Demande refusée' : 'Request refused',
        description: data?.error || (fr ? 'Vérifiez le montant et votre mot de passe.' : 'Check the amount and your password.'),
        variant: 'destructive',
      });
      return;
    }
    setOtpId(data.otpId);
    setStep('otp');
    toast({
      title: fr ? 'Code envoyé par email' : 'Code sent by email',
      description: fr ? 'Saisissez le code à 6 chiffres reçu par email.' : 'Enter the 6-digit code you received by email.',
    });
  };

  const confirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('payout-security', {
      body: { action: 'confirm', establishmentId, otpId, code },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({
        title: fr ? 'Code invalide' : 'Invalid code',
        description: data?.error,
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: fr ? 'Demande confirmée' : 'Request confirmed',
      description: fr ? 'Elle sera traitée sous 48h.' : 'It will be processed within 48h.',
    });
    closeDialog();
    load();
  };

  const closeDialog = () => {
    setOpen(false);
    setStep('form');
    setCode('');
    setOtpId('');
    setForm({ amount: '', method: 'mtn_momo', phone: '', password: '' });
  };


  if (loading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: fr ? 'Total généré' : 'Total earned', value: total },
          { label: fr ? 'Disponible' : 'Available', value: available },
          { label: fr ? 'En attente' : 'Pending', value: pending },
          { label: fr ? 'Déjà versé' : 'Already paid', value: paid },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">{c.label}</p>
              <p className="text-xl font-bold mt-1">{c.value.toLocaleString()} FCFA</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" disabled={available < 500}>
              <Wallet className="h-4 w-4 mr-2" />{fr ? 'Demander un retrait' : 'Request a payout'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{fr ? 'Demande de retrait' : 'Payout request'}</DialogTitle></DialogHeader>
            <form onSubmit={request} className="space-y-4">
              <div>
                <Label htmlFor="am">{fr ? 'Montant (FCFA)' : 'Amount (FCFA)'}</Label>
                <Input id="am" type="number" min={500} max={available} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">{fr ? 'Disponible' : 'Available'}: {available.toLocaleString()} FCFA</p>
              </div>
              <div>
                <Label>{fr ? 'Moyen de paiement' : 'Payment method'}</Label>
                <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mtn_momo">MTN MoMo</SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="pn">{fr ? 'Numéro' : 'Phone number'}</Label>
                <Input id="pn" required maxLength={20} placeholder="+2376XXXXXXXX" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit">{fr ? 'Envoyer' : 'Send'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Coins className="h-5 w-5" />{fr ? 'Commissions de parrainage' : 'Referral commissions'}</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{fr ? 'Date' : 'Date'}</TableHead>
                <TableHead>{fr ? 'Élève' : 'Student'}</TableHead>
                <TableHead>{fr ? 'Offre' : 'Plan'}</TableHead>
                <TableHead>{fr ? 'Montant' : 'Amount'}</TableHead>
                <TableHead>{fr ? 'Statut' : 'Status'}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="text-sm">{new Date(c.created_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</TableCell>
                  <TableCell>{c.referred_name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{c.plan_name}</TableCell>
                  <TableCell>{c.amount.toLocaleString()} FCFA</TableCell>
                  <TableCell><Badge variant={c.status === 'paid' ? 'secondary' : 'outline'}>{c.status}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">{fr ? 'Historique des retraits' : 'Payout history'}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm">
              <span>{new Date(p.requested_at).toLocaleDateString(fr ? 'fr-FR' : 'en-GB')}</span>
              <span className="font-medium">{p.amount.toLocaleString()} FCFA</span>
              <span className="text-muted-foreground">{p.method === 'mtn_momo' ? 'MTN MoMo' : 'Orange Money'} · {p.phone}</span>
              <Badge variant={p.status === 'paid' ? 'secondary' : 'outline'}>{p.status}</Badge>
            </div>
          ))}
          {payouts.length === 0 && <p className="text-sm text-muted-foreground">{fr ? 'Aucun retrait demandé.' : 'No payout requested yet.'}</p>}
        </CardContent>
      </Card>
    </div>
  );
}