import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ShieldCheck, Wallet } from 'lucide-react';

interface Props {
  kind: 'establishment' | 'affiliate';
  establishmentId?: string;
  available: number;
  minPayout: number;
  onDone: () => void;
}

/** Password + email OTP protected payout request, shared by schools and referrers. */
export default function PayoutRequestDialog({ kind, establishmentId, available, minPayout, onDone }: Props) {
  const { language } = useLanguage();
  const fr = language === 'fr';
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otpId, setOtpId] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ amount: '', method: 'mtn_momo', phone: '', password: '' });

  const close = () => {
    setOpen(false); setStep('form'); setCode(''); setOtpId('');
    setForm({ amount: '', method: 'mtn_momo', phone: '', password: '' });
  };

  const startRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('payout-security', {
      body: { action: 'request', kind, establishmentId, amount: parseInt(form.amount, 10), method: form.method, phone: form.phone.trim(), password: form.password },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({ title: fr ? 'Demande refusée' : 'Request refused', description: data?.error || (fr ? 'Vérifiez le montant et votre mot de passe.' : 'Check the amount and your password.'), variant: 'destructive' });
      return;
    }
    setOtpId(data.otpId);
    setStep('otp');
    toast({ title: fr ? 'Code envoyé par email' : 'Code sent by email', description: fr ? 'Saisissez le code à 6 chiffres reçu par email.' : 'Enter the 6-digit code you received by email.' });
  };

  const confirmRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('payout-security', {
      body: { action: 'confirm', kind, establishmentId, otpId, code },
    });
    setSubmitting(false);
    if (error || data?.error) {
      toast({ title: fr ? 'Code invalide' : 'Invalid code', description: data?.error, variant: 'destructive' });
      return;
    }
    toast({ title: fr ? 'Demande confirmée' : 'Request confirmed', description: fr ? 'Elle sera traitée sous 48h.' : 'It will be processed within 48h.' });
    close();
    onDone();
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : close())}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={available < minPayout}>
            <Wallet className="h-4 w-4 mr-2" />{fr ? 'Demander un retrait' : 'Request a payout'}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-secondary" />
              {step === 'form' ? (fr ? 'Demande de retrait' : 'Payout request') : (fr ? 'Confirmation par email' : 'Email confirmation')}
            </DialogTitle>
          </DialogHeader>
          {step === 'form' ? (
            <form onSubmit={startRequest} className="space-y-4">
              <div>
                <Label htmlFor="am">{fr ? 'Montant (FCFA)' : 'Amount (FCFA)'}</Label>
                <Input id="am" type="number" min={minPayout} max={available} required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">
                  {fr ? 'Disponible' : 'Available'}: {available.toLocaleString()} FCFA · {fr ? 'Minimum' : 'Minimum'}: {minPayout.toLocaleString()} FCFA
                </p>
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
              <div>
                <Label htmlFor="pw">{fr ? 'Votre mot de passe' : 'Your password'}</Label>
                <Input id="pw" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-muted-foreground mt-1">{fr ? 'Un code de confirmation à 6 chiffres vous sera envoyé par email.' : 'A 6-digit confirmation code will be emailed to you.'}</p>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit" disabled={submitting}>{fr ? 'Continuer' : 'Continue'}</Button>
              </div>
            </form>
          ) : (
            <form onSubmit={confirmRequest} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {fr ? 'Saisissez le code à 6 chiffres envoyé par email. Il expire dans 10 minutes et ne peut être utilisé qu’une seule fois.' : 'Enter the 6-digit code sent by email. It expires in 10 minutes and can only be used once.'}
              </p>
              <div>
                <Label htmlFor="otp">{fr ? 'Code de confirmation' : 'Confirmation code'}</Label>
                <Input id="otp" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={close}>{fr ? 'Annuler' : 'Cancel'}</Button>
                <Button type="submit" disabled={submitting || code.length !== 6}>{fr ? 'Confirmer le retrait' : 'Confirm payout'}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
      <p className="text-xs text-muted-foreground">{fr ? 'Retrait minimum' : 'Minimum payout'} : {minPayout.toLocaleString()} FCFA</p>
    </div>
  );
}
